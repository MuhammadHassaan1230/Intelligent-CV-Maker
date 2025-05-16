import { useState } from 'react';

export default function CVMaker() {
  // State for form inputs
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    education: '',
    university: '',
    graduation: '',
    description: '',
    githubUsername: '',
    skills: '',
  });
  
  // State for GitHub data
  const [githubData, setGithubData] = useState(null);
  const [topProjects, setTopProjects] = useState([]);
  const [languages, setLanguages] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // State for CV preview
  const [showCV, setShowCV] = useState(false);
  
  // Backend API URL - would come from environment variables in production
  const API_URL = 'http://localhost:5000';
  
  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };
  
  // Fetch GitHub data from our backend
  const fetchGitHubData = async () => {
    if (!formData.githubUsername) {
      setError('Please enter a GitHub username');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      // Call our Flask backend API
      const response = await fetch(`${API_URL}/api/github-profile?username=${formData.githubUsername}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch GitHub data');
      }
      
      const data = await response.json();
      
      // Update state with response data
      setGithubData(data.user_data);
      setTopProjects(data.top_repos);
      setLanguages(data.languages);
      
      return data;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Generate the CV
  const generateCV = async () => {
    // Validate form
    if (!formData.name || !formData.email || !formData.education || !formData.university) {
      setError('Please fill in all required fields');
      return;
    }
    
    // Fetch GitHub data first
    const githubResult = await fetchGitHubData();
    
    if (!githubResult) {
      return; // Error occurred during GitHub data fetch
    }
    
    try {
      // Send data to backend for CV generation
      const response = await fetch(`${API_URL}/api/generate-cv`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalInfo: formData,
          githubData: githubResult
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate CV');
      }
      
      // Show CV preview
      setShowCV(true);
    } catch (err) {
      setError(err.message);
    }
  };
  
  // Get top programming languages
  const getTopLanguages = () => {
    return Object.entries(languages)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(lang => lang[0]);
  };
  
  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 text-center">Intelligent CV Maker for Freshers</h1>
      
      {!showCV ? (
        <div className="space-y-6">
          <div className="bg-blue-50 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">Personal Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Full Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Phone</label>
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">GitHub Username</label>
                <input
                  type="text"
                  name="githubUsername"
                  value={formData.githubUsername}
                  onChange={handleChange}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Brief Professional Summary</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  className="w-full p-2 border rounded"
                  rows="3"
                />
              </div>
            </div>
          </div>
          
          <div className="bg-green-50 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">Education</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Degree/Major</label>
                <input
                  type="text"
                  name="education"
                  value={formData.education}
                  onChange={handleChange}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">University/Institution</label>
                <input
                  type="text"
                  name="university"
                  value={formData.university}
                  onChange={handleChange}
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Graduation Year</label>
                <input
                  type="text"
                  name="graduation"
                  value={formData.graduation}
                  onChange={handleChange}
                  className="w-full p-2 border rounded"
                />
              </div>
            </div>
          </div>
          
          <div className="bg-purple-50 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">Additional Skills</h2>
            <div>
              <label className="block text-sm font-medium mb-1">Other Skills (comma separated)</label>
              <textarea
                name="skills"
                value={formData.skills}
                onChange={handleChange}
                placeholder="e.g., Team Leadership, Communication, Problem Solving"
                className="w-full p-2 border rounded"
                rows="2"
              />
            </div>
          </div>
          
          <div className="flex justify-center">
            <button
              onClick={generateCV}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium text-lg hover:bg-blue-700"
            >
              Generate CV
            </button>
          </div>
          
          {isLoading && <p className="text-center">Loading GitHub data...</p>}
          {error && <p className="text-red-500 text-center">{error}</p>}
        </div>
      ) : (
        <div>
          <div className="mb-4 flex justify-between">
            <button
              onClick={() => setShowCV(false)}
              className="bg-gray-200 px-4 py-2 rounded"
            >
              Back to Form
            </button>
            <button
              onClick={() => window.print()}
              className="bg-green-600 text-white px-4 py-2 rounded"
            >
              Print / Save as PDF
            </button>
          </div>
          
          {/* ATS-friendly CV Template */}
          <div className="border p-8 rounded bg-white print:shadow-none" id="cv-content">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold">{formData.name}</h1>
              <p className="text-gray-700">{formData.email} • {formData.phone} • GitHub: {formData.githubUsername}</p>
            </div>
            
            <div className="mb-6">
              <h2 className="text-lg font-bold border-b pb-1 mb-2">SUMMARY</h2>
              <p>{formData.description}</p>
            </div>
            
            <div className="mb-6">
              <h2 className="text-lg font-bold border-b pb-1 mb-2">EDUCATION</h2>
              <div className="flex justify-between">
                <div>
                  <p className="font-semibold">{formData.university}</p>
                  <p>{formData.education}</p>
                </div>
                <div>
                  <p>{formData.graduation}</p>
                </div>
              </div>
            </div>
            
            <div className="mb-6">
              <h2 className="text-lg font-bold border-b pb-1 mb-2">TECHNICAL SKILLS</h2>
              <p>
                <strong>Programming Languages:</strong> {getTopLanguages().join(', ')}
              </p>
              {formData.skills && (
                <p className="mt-2">
                  <strong>Additional Skills:</strong> {formData.skills}
                </p>
              )}
            </div>
            
            <div className="mb-6">
              <h2 className="text-lg font-bold border-b pb-1 mb-2">PROJECTS</h2>
              {topProjects.map((project, index) => (
                <div key={index} className="mb-4">
                  <div className="flex justify-between">
                    <p className="font-semibold">{project.name}</p>
                    <p className="text-sm">
                      {new Date(project.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })} - 
                      {new Date(project.updated_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })}
                    </p>
                  </div>
                  <p className="text-sm mb-1">
                    <strong>Tech Stack:</strong> {project.language || 'Various technologies'}
                  </p>
                  <ul className="list-disc pl-5">
                    <li>{project.enhanced_description}</li>
                    {project.homepage && (
                      <li>Deployed and maintained a live implementation at {project.homepage}</li>
                    )}
                    <li>Repository: <a href={project.html_url} className="text-blue-600">{project.html_url}</a></li>
                  </ul>
                </div>
              ))}
            </div>
            
            <div>
              <h2 className="text-lg font-bold border-b pb-1 mb-2">GITHUB STATS</h2>
              <p>
                {githubData?.public_repos} Public Repositories • 
                {githubData?.followers} Followers •
                Active since {new Date(githubData?.created_at).getFullYear()}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}