from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import os
from langchain_groq import ChatGroq
from langchain.prompts import ChatPromptTemplate
from langchain.schema import StrOutputParser
import json
from dotenv import load_dotenv

app = Flask(__name__)
CORS(app)
load_dotenv() 
try:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise ValueError("GROQ_API_KEY not found in environment or .env file")
    
    llm = ChatGroq(
        model_name="llama3-70b-8192",
        temperature=0.3,
        api_key=api_key 
    )
except Exception as e:
    print(f"Warning: Groq LLM initialization failed: {e}")
    print("API descriptions will use fallback method")
    llm = None

@app.route('/api/github-profile', methods=['GET'])
def get_github_profile():
    """Fetch GitHub profile data for a user"""
    github_username = request.args.get('username')
    
    if not github_username:
        return jsonify({'error': 'GitHub username is required'}), 400
    
    try:
        # Fetch user data
        user_url = f"https://api.github.com/users/{github_username}"
        user_response = requests.get(user_url)
        user_response.raise_for_status()
        user_data = user_response.json()
        
        # Fetch repositories
        repos_url = f"https://api.github.com/users/{github_username}/repos?sort=updated&per_page=100"
        repos_response = requests.get(repos_url)
        repos_response.raise_for_status()
        repos_data = repos_response.json()
        
        # Extract languages from repos
        language_counts = {}
        for repo in repos_data:
            lang = repo.get('language')
            if lang:
                language_counts[lang] = language_counts.get(lang, 0) + 1
        
        # Sort repositories by a combined score of stars and recency
        for repo in repos_data:
            # Calculate score: stars (weight 3) + recency (normalized)
            stars = repo.get('stargazers_count', 0) * 3
            updated_date = repo.get('updated_at', '')
            # Simple numeric representation of date for sorting
            date_score = 0
            if updated_date:
                # Convert date string to timestamp value
                from datetime import datetime
                try:
                    dt = datetime.strptime(updated_date, "%Y-%m-%dT%H:%M:%SZ")
                    date_score = dt.timestamp() / 1000000  # Normalize to comparable scale
                except:
                    pass
            
            repo['score'] = stars + date_score
        
        # Sort repos by score (descending)
        sorted_repos = sorted(repos_data, key=lambda x: x.get('score', 0), reverse=True)
        
        # Select top repositories
        top_repos = sorted_repos[:5]  # Get top 5 for more options
        
        # Add enhanced descriptions to top repositories
        top_repos_with_descriptions = []
        for i, repo in enumerate(top_repos):
            if i < 2:  # Process only top 2 for the CV
                enhanced_description = generate_project_description(repo, repos_data)
                repo_with_description = {**repo, 'enhanced_description': enhanced_description}
                top_repos_with_descriptions.append(repo_with_description)
        
        return jsonify({
            'user_data': user_data,
            'top_repos': top_repos_with_descriptions,
            'languages': language_counts
        })
        
    except requests.exceptions.HTTPError as e:
        return jsonify({'error': f'GitHub API error: {str(e)}'}), 404
    except Exception as e:
        return jsonify({'error': f'Error fetching GitHub data: {str(e)}'}), 500

def generate_project_description(project, all_repos):
    """Generate enhanced description for a project using LangChain and Groq"""
    
    # Extract relevant project data
    project_data = {
        'name': project.get('name', ''),
        'language': project.get('language', 'various technologies'),
        'description': project.get('description', 'software project'),
        'stars': project.get('stargazers_count', 0),
        'forks': project.get('forks_count', 0),
        'created_at': project.get('created_at', ''),
        'updated_at': project.get('updated_at', ''),
        'homepage': project.get('homepage', ''),
        'is_fork': project.get('fork', False),
        'topics': project.get('topics', []),
    }
    
    # Get similar repositories by language
    related_repos = [
        repo for repo in all_repos 
        if repo.get('language') == project_data['language'] and repo['id'] != project['id']
    ]
    expertise_level = len(related_repos)
    
    # If LLM is available, use it for description generation
    if llm:
        try:
            # Create context for LLM
            context = {
                **project_data,
                'related_projects_count': expertise_level,
                'has_expertise': expertise_level > 2
            }
            
            # Build prompt
            prompt = ChatPromptTemplate.from_messages([
                ("system", """You are an expert CV writer helping a fresh graduate describe their GitHub projects in a professional way.
                Create a concise, impressive description for this project that:
                1. Highlights technical skills and languages used
                2. Emphasizes accomplishments and impact
                3. Uses strong action verbs
                4. Is 2-3 sentences long
                5. Is suitable for a professional CV/Resume
                Make it sound professional but honest, and focus on the most relevant aspects for an employer.
                """),
                ("user", """Project details:
                Name: {name}
                Main language: {language}
                Description: {description}
                Stars: {stars}
                Forks: {forks}
                Created: {created_at}
                Last updated: {updated_at}
                Related projects by this developer using same language: {related_projects_count}
                
                Write a professional, concise project description for a CV:""")
            ])
            
            # Generate response
            chain = prompt | llm | StrOutputParser()
            description = chain.invoke(context)
            return description.strip()
            
        except Exception as e:
            print(f"LLM description generation failed: {e}")
            # Fall back to template approach
    
    # Fallback template-based approach if LLM fails or is unavailable
    # Using same logic as the frontend simulation but on the backend
    has_stars = project_data['stars'] > 0
    has_forks = project_data['forks'] > 0
    has_expertise = expertise_level > 2
    
    # Check if project was recently updated
    from datetime import datetime, timedelta
    try:
        updated_date = datetime.strptime(project_data['updated_at'], "%Y-%m-%dT%H:%M:%SZ")
        is_recent = (datetime.now() - updated_date) < timedelta(days=90)
    except:
        is_recent = False
    
    descriptions = []
    
    # Technical description
    tech_desc = f"Developed a {project_data['description']} using {project_data['language']}"
    descriptions.append(tech_desc)
    
    # Achievements
    if has_stars:
        descriptions.append(f"Gained recognition with {project_data['stars']} stars on GitHub")
    
    # Collaboration
    if has_forks:
        descriptions.append(f"Created code that was forked {project_data['forks']} times by other developers")
    
    # Expertise
    if has_expertise:
        descriptions.append(f"Applied specialized {project_data['language']} skills developed across multiple projects")
    
    # Activity
    if is_recent:
        descriptions.append("Actively maintained with recent updates and enhancements")
    
    return " ".join(descriptions)

@app.route('/api/generate-cv', methods=['POST'])
def generate_cv():
    """Generate a complete CV with enhanced descriptions"""
    try:
        # Get form data and GitHub data from request
        data = request.json
        
        # Here you could add more CV processing logic if needed
        # For example, optimizing layout, adding custom sections, etc.
        
        return jsonify({
            'status': 'success',
            'message': 'CV generated successfully',
            'data': data
        })
        
    except Exception as e:
        return jsonify({'error': f'Error generating CV: {str(e)}'}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)