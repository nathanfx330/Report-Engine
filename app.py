# app.py
import os
import json
from flask import Flask, render_template, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

# Initialize database extension
db = SQLAlchemy()

# --- Database Models ---
class Scenario(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False)
    content_json = db.Column(db.JSON, nullable=False)
    last_updated = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_autosave = db.Column(db.Boolean, default=False, nullable=False, index=True)

    def __repr__(self):
        return f"<Scenario {self.id}: {self.name}>"

class PromptStyle(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    instruction = db.Column(db.Text, nullable=False)
    is_deletable = db.Column(db.Boolean, nullable=False, default=True)

    def __repr__(self):
        return f"<PromptStyle {self.id}: {self.name}>"
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'instruction': self.instruction,
            'is_deletable': self.is_deletable
        }

def create_app(test_config=None):
    """Application Factory Pattern"""
    app = Flask(__name__, instance_relative_config=True)
    
    # --- Configuration ---
    basedir = os.path.abspath(os.path.dirname(__file__))
    try:
        os.makedirs(app.instance_path)
    except OSError:
        pass
        
    app.config.from_mapping(
        SECRET_KEY='dev', # Change this for production
        SQLALCHEMY_DATABASE_URI='sqlite:///' + os.path.join(app.instance_path, 'project.db'),
        SQLALCHEMY_TRACK_MODIFICATIONS=False,
        JSON_SORT_KEYS=False,
    )

    if test_config:
        app.config.from_mapping(test_config)

    db.init_app(app)

    with app.app_context():
        # --- Main Routes ---
        @app.route('/')
        def index():
            autosave = Scenario.query.filter_by(is_autosave=True).order_by(Scenario.last_updated.desc()).first()
            return render_template('index.html', 
                                   loaded_data=autosave.content_json if autosave else None,
                                   session_name=autosave.name if autosave else "New Scenario")

        @app.route('/load/<int:scenario_id>')
        def load_scenario(scenario_id):
            scenario = db.get_or_404(Scenario, scenario_id)
            autosave = Scenario.query.filter_by(is_autosave=True).first()
            autosave_name = f"Editing: {scenario.name}"
            
            if autosave:
                autosave.content_json = scenario.content_json
                autosave.name = autosave_name
            else:
                autosave = Scenario(name=autosave_name, content_json=scenario.content_json, is_autosave=True)
                db.session.add(autosave)
            db.session.commit()
            
            return render_template('index.html', loaded_data=scenario.content_json, session_name=autosave_name)

        # --- API Routes ---
        @app.route('/api/state', methods=['POST'])
        def update_autosave_state():
            data = request.get_json()
            if not data: return jsonify({"error": "Invalid JSON"}), 400
            
            autosave = Scenario.query.filter_by(is_autosave=True).first()
            if autosave:
                autosave.content_json = data
                autosave.name = f"Auto-save @ {datetime.utcnow().strftime('%b %d, %H:%M:%S')}"
            else:
                autosave = Scenario(
                    name=f"Auto-save @ {datetime.utcnow().strftime('%b %d, %H:%M:%S')}",
                    content_json=data,
                    is_autosave=True
                )
                db.session.add(autosave)
            db.session.commit()
            return jsonify({"status": "success", "name": autosave.name})

        @app.route('/api/scenarios', methods=['GET', 'POST'])
        def handle_scenarios():
            if request.method == 'POST':
                data = request.get_json()
                name = data.get('name')
                content = data.get('content')
                if not name or not content: return jsonify({"error": "Missing name or content"}), 400
                scenario = Scenario(name=name, content_json=content, is_autosave=False)
                db.session.add(scenario)
                db.session.commit()
                return jsonify({"status": "success", "id": scenario.id}), 201

            scenarios = Scenario.query.filter_by(is_autosave=False).order_by(Scenario.last_updated.desc()).all()
            return jsonify([{'id': s.id, 'name': s.name, 'last_updated': s.last_updated.strftime('%b %d, %Y %H:%M UTC')} for s in scenarios])

        @app.route('/api/scenarios/<int:scenario_id>', methods=['DELETE'])
        def delete_saved_scenario(scenario_id):
            scenario = db.get_or_404(Scenario, scenario_id)
            if scenario.is_autosave: return jsonify({"error": "Cannot delete an autosave session directly"}), 403
            db.session.delete(scenario)
            db.session.commit()
            return jsonify({"status": "success"}), 204
            
        @app.route('/api/scenarios/new', methods=['POST'])
        def clear_autosave():
            Scenario.query.filter_by(is_autosave=True).delete()
            db.session.commit()
            return jsonify({"status": "success"})

        @app.route('/api/prompts', methods=['GET', 'POST'])
        def handle_prompts():
            if request.method == 'POST':
                data = request.get_json()
                if not data or not data.get('name') or not data.get('instruction'): return jsonify({"error": "Missing name or instruction"}), 400
                prompt = PromptStyle(name=data['name'], instruction=data['instruction'])
                db.session.add(prompt)
                db.session.commit()
                return jsonify(prompt.to_dict()), 201

            prompts = PromptStyle.query.order_by(PromptStyle.is_deletable, PromptStyle.name).all()
            return jsonify([p.to_dict() for p in prompts])

        @app.route('/api/prompts/<int:prompt_id>', methods=['DELETE'])
        def delete_prompt(prompt_id):
            prompt = db.get_or_404(PromptStyle, prompt_id)
            if not prompt.is_deletable: return jsonify({"error": "Cannot delete a default prompt style"}), 403
            db.session.delete(prompt)
            db.session.commit()
            return jsonify({"status": "success"}), 204
        
        @app.route('/api/generate-prompt', methods=['POST'])
        def generate_prompt_text():
            data = request.get_json()
            if not data: return jsonify({'error': 'Invalid JSON body'}), 400
            
            prompt_style = db.get_or_404(PromptStyle, data.get('prompt_id'))
            scenario_data = data.get('scenario', {})
            entities, locations, events = scenario_data.get('entities', []), scenario_data.get('locations', []), scenario_data.get('events', [])
            entity_map = {e['id']: e['name'] for e in entities}
            location_map = {l['id']: l['name'] for l in locations}
            
            parts = [prompt_style.instruction]
            if entities: parts.append("--- Dramatis Personae ---\n" + "\n".join(f"- {e['name']} ({e['type']})" for e in entities))
            if locations: parts.append("--- Key Locations ---\n" + "\n".join(f"- {l['name']}" for l in locations))
            if events:
                event_lines = []
                for i, event in enumerate(events, 1):
                    who = ", ".join(entity_map.get(eid, "?") for eid in event.get('who', [])) or "N/A"
                    where = location_map.get(event.get('where'), "?") if event.get('where') else "N/A"
                    event_lines.append(f"Event #{i}:\n- Involved: {who}\n- What: {event.get('what', 'N/A')}\n- When: {event.get('when', 'N/A')}\n- Where: {where}\n- Why/Motivation: {event.get('why', 'N/A')}")
                parts.append("--- Sequence of Events ---\n" + "\n\n".join(event_lines))

            return jsonify({'prompt': "\n\n".join(parts)})

        db.create_all()
        seed_default_prompts(app)
        return app

def seed_default_prompts(app):
    with app.app_context():
        if PromptStyle.query.first(): return
        default_prompts = [
            {"name": "Coherent Narrative", "instruction": "You are a master storyteller. Weave the following series of events into a single, coherent narrative.", "is_deletable": False},
            {"name": "Investigative Timeline", "instruction": "You are a meticulous investigator. Create a detailed timeline based on the provided events.", "is_deletable": False},
            {"name": "Multi-Scene Script", "instruction": "You are a professional screenwriter. Write a script that covers the following events.", "is_deletable": False},
        ]
        for p_data in default_prompts:
            db.session.add(PromptStyle(**p_data))
        db.session.commit()

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True)
