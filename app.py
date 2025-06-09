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

# --- Database Model ---
class Scenario(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False)
    content_json = db.Column(db.Text, nullable=False)
    last_updated = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_autosave = db.Column(db.Boolean, default=False, nullable=False, index=True)

# --- Prompt Style Instructions ---
PROMPT_STYLES = {
    "narrative": "You are a master storyteller. Weave the following series of events into a single, coherent narrative. First, familiarize yourself with the cast of characters, organizations, and key locations provided. Then, use the event list to build the story.",
    "timeline": "You are a meticulous investigator. Based on the entities, locations, and events provided, create a detailed timeline. Start by listing the key players and locations. For each timeline entry, note the involved entities and highlight any connections.",
    "script": "You are a professional screenwriter. Write a script that covers the following events. The 'Dramatis Personae' and 'Locations' sections list your cast and settings. Create new scenes for distinct events.",
    "report": "You are a security analyst. Consolidate the following incident reports into a single executive summary. The 'Entities of Interest' and 'Relevant Locations' are your subjects and settings. Detail each event chronologically and conclude with a threat assessment."
}

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
    style, scenario = data.get('style'), data.get('scenario', {})
    entities, locations, events = scenario.get('entities', []), scenario.get('locations', []), scenario.get('events', [])
    instruction = PROMPT_STYLES.get(style, "Summarize...")
    
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

# --- UPDATED API ROUTE ---
@app.route('/api/saved-scenarios')
def get_saved_scenarios():
    """Returns a list of ALL named scenarios, most recent first."""
    # The .limit(10) has been removed.
    scenarios = Scenario.query.filter_by(is_autosave=False).order_by(Scenario.last_updated.desc()).all()
    return jsonify([{'id': s.id, 'name': s.name, 'last_updated': s.last_updated.strftime('%b %d, %Y %H:%M UTC')} for s in scenarios])

@app.route('/api/delete/<int:scenario_id>', methods=['POST'])
def delete_scenario(scenario_id):
    scenario = db.get_or_404(Scenario, scenario_id)
    if scenario.is_autosave: return jsonify({'status': 'error', 'message': 'Cannot delete autosave session'}), 403
    db.session.delete(scenario)
    db.session.commit()
    return jsonify({'status': 'success'})

# --- Main Execution ---
if __name__ == '__main__':
    if not os.path.exists(os.path.join(basedir, 'instance')): os.makedirs(os.path.join(basedir, 'instance'))
    with app.app_context(): db.create_all()
    app.run(debug=True)
