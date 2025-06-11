# app.py
import json
from flask import Flask, render_template, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import os

# --- App & Database Configuration ---
app = Flask(__name__)
basedir = os.path.abspath(os.path.dirname(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'instance', 'project.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# --- Database Models ---
class Scenario(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False)
    content_json = db.Column(db.Text, nullable=False)
    last_updated = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_autosave = db.Column(db.Boolean, default=False, nullable=False, index=True)

class PromptStyle(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    instruction = db.Column(db.Text, nullable=False)
    is_deletable = db.Column(db.Boolean, nullable=False, default=True)

def seed_default_prompts():
    """Seeds the database with default, non-deletable prompts if they don't exist."""
    default_prompts = [
        {"name": "Coherent Narrative", "instruction": "You are a master storyteller. Weave the following series of events into a single, coherent narrative. First, familiarize yourself with the cast of characters, organizations, and key locations provided. Then, use the event list to build the story.", "is_deletable": False},
        {"name": "Investigative Timeline", "instruction": "You are a meticulous investigator. Based on the entities, locations, and events provided, create a detailed timeline. Start by listing the key players and locations. For each timeline entry, note the involved entities and highlight any connections.", "is_deletable": False},
        {"name": "Multi-Scene Script", "instruction": "You are a professional screenwriter. Write a script that covers the following events. The 'Dramatis Personae' and 'Locations' sections list your cast and settings. Create new scenes for distinct events.", "is_deletable": False},
        {"name": "Consolidated Incident Report", "instruction": "You are a security analyst. Consolidate the following incident reports into a single executive summary. The 'Entities of Interest' and 'Relevant Locations' are your subjects and settings. Detail each event chronologically and conclude with a threat assessment.", "is_deletable": False},
        {"name": "Factual Testimony", "instruction": "You are a witness preparing a compelling, first-person testimony for a formal hearing. Using the provided facts, entities, and events, construct a clear and persuasive statement. Recount the events from your perspective, focusing on factual accuracy and emotional impact where appropriate. Your testimony should be structured logically and be easy to follow.", "is_deletable": False},
    ]
    
    for p in default_prompts:
        exists = PromptStyle.query.filter_by(name=p['name']).first()
        if not exists:
            new_prompt = PromptStyle(name=p['name'], instruction=p['instruction'], is_deletable=p['is_deletable'])
            db.session.add(new_prompt)
    db.session.commit()

# --- Main Application Routes ---
@app.route('/')
def index():
    autosave_session = Scenario.query.filter_by(is_autosave=True).order_by(Scenario.last_updated.desc()).first()
    session_name = autosave_session.name if autosave_session else "New Scenario"
    loaded_data = autosave_session.content_json if autosave_session else None
    return render_template('index.html', loaded_data=loaded_data, session_name=session_name)

@app.route('/load/<int:scenario_id>')
def load_scenario(scenario_id):
    scenario = db.get_or_404(Scenario, scenario_id)
    autosave_session = Scenario.query.filter_by(is_autosave=True).first()
    autosave_name = f"Editing: {scenario.name}"
    
    if not autosave_session:
        autosave_session = Scenario(name=autosave_name, is_autosave=True, content_json=scenario.content_json)
        db.session.add(autosave_session)
    else:
        autosave_session.content_json = scenario.content_json
        autosave_session.name = autosave_name
    db.session.commit()
    
    return render_template('index.html', loaded_data=scenario.content_json, session_name=autosave_name)

# --- API Routes ---
@app.route('/api/generate-prompt', methods=['POST'])
def api_generate_prompt():
    data = request.json
    prompt_id, scenario = data.get('prompt_id'), data.get('scenario', {})
    
    prompt_style = db.get_or_404(PromptStyle, prompt_id)
    instruction = prompt_style.instruction

    entities, locations, events = scenario.get('entities', []), scenario.get('locations', []), scenario.get('events', [])
    d_parts = [f"--- Dramatis Personae ---"] + [f"- {e['name']} ({e['type']})" for e in entities] if entities else []
    l_parts = [f"--- Key Locations ---"] + [f"- {l['name']}" for l in locations] if locations else []
    e_parts = [f"--- Sequence of Events ---"]
    if events:
        for i, event in enumerate(events, 1):
            who = ", ".join(event.get('who', [])) or "N/A"
            e_parts.append(f"Event #{i}:\n- Involved: {who}\n- What: {event.get('what', 'N/A')}\n- When: {event.get('when', 'N/A')}\n- Where: {event.get('where', 'N/A')}\n- Why/Motivation: {event.get('why', 'N/A')}")
    
    all_parts = [instruction]
    if d_parts: all_parts.append("\n".join(d_parts))
    if l_parts: all_parts.append("\n".join(l_parts))
    if events and len(e_parts) > 1: all_parts.append("\n".join(e_parts))
    
    prompt = "\n\n".join(all_parts)
    return jsonify({'prompt': prompt})

@app.route('/api/autosave', methods=['POST'])
def handle_autosave():
    data = request.json
    session = Scenario.query.filter_by(is_autosave=True).first()
    if session:
        session.content_json = json.dumps(data)
    else:
        name = f"Auto-save @ {datetime.utcnow().strftime('%b %d, %H:%M')}"
        session = Scenario(name=name, is_autosave=True, content_json=json.dumps(data))
        db.session.add(session)
    db.session.commit()
    return jsonify({'status': 'success', 'name': session.name})

@app.route('/api/save', methods=['POST'])
def handle_save():
    data = request.json
    name, content = data.get('name'), data.get('content')
    if not name or not content: return jsonify({'status': 'error', 'message': 'Missing name or content'}), 400
    new_scenario = Scenario(name=name, content_json=json.dumps(content), is_autosave=False)
    db.session.add(new_scenario)
    db.session.commit()
    return jsonify({'status': 'success', 'id': new_scenario.id})

@app.route('/api/saved-scenarios')
def get_saved_scenarios():
    scenarios = Scenario.query.filter_by(is_autosave=False).order_by(Scenario.last_updated.desc()).all()
    return jsonify([{'id': s.id, 'name': s.name, 'last_updated': s.last_updated.strftime('%b %d, %Y %H:%M UTC')} for s in scenarios])

@app.route('/api/delete/<int:scenario_id>', methods=['POST'])
def delete_scenario(scenario_id):
    scenario = db.get_or_404(Scenario, scenario_id)
    if scenario.is_autosave: return jsonify({'status': 'error', 'message': 'Cannot delete autosave session'}), 403
    db.session.delete(scenario)
    db.session.commit()
    return jsonify({'status': 'success'})

@app.route('/api/new-scenario', methods=['POST'])
def new_scenario():
    session = Scenario.query.filter_by(is_autosave=True).first()
    if session:
        db.session.delete(session)
        db.session.commit()
    return jsonify({'status': 'success', 'message': 'New session ready.'})

@app.route('/api/prompts', methods=['GET'])
def get_prompts():
    prompts = PromptStyle.query.order_by(PromptStyle.is_deletable, PromptStyle.name).all()
    return jsonify([{
        'id': p.id, 
        'name': p.name, 
        'instruction': p.instruction, 
        'is_deletable': p.is_deletable
    } for p in prompts])

@app.route('/api/prompts/add', methods=['POST'])
def add_prompt():
    data = request.json
    name, instruction = data.get('name'), data.get('instruction')
    if not name or not instruction:
        return jsonify({'status': 'error', 'message': 'Name and instruction are required.'}), 400
    
    new_prompt = PromptStyle(name=name, instruction=instruction, is_deletable=True)
    db.session.add(new_prompt)
    db.session.commit()
    return jsonify({'status': 'success', 'prompt': {'id': new_prompt.id, 'name': new_prompt.name, 'instruction': new_prompt.instruction, 'is_deletable': True}}), 201

@app.route('/api/prompts/delete/<int:prompt_id>', methods=['POST'])
def delete_prompt(prompt_id):
    prompt = db.get_or_404(PromptStyle, prompt_id)
    if not prompt.is_deletable:
        return jsonify({'status': 'error', 'message': 'Cannot delete a default prompt.'}), 403
    
    db.session.delete(prompt)
    db.session.commit()
    return jsonify({'status': 'success'})

# --- Main Execution ---
if __name__ == '__main__':
    if not os.path.exists(os.path.join(basedir, 'instance')):
        os.makedirs(os.path.join(basedir, 'instance'))
    with app.app_context():
        db.create_all()
        seed_default_prompts()
    app.run(debug=True)
