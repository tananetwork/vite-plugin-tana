import React from 'react'

const projects = [
  {
    id: 1,
    title: 'E-Commerce Platform',
    description: 'A full-stack marketplace built with React and Tana smart contracts.',
    tags: ['React', 'TypeScript', 'Tana'],
    image: 'https://via.placeholder.com/400x300/3b82f6/ffffff?text=E-Commerce',
  },
  {
    id: 2,
    title: 'DeFi Dashboard',
    description: 'Real-time analytics dashboard for decentralized finance protocols.',
    tags: ['React', 'D3.js', 'WebSocket'],
    image: 'https://via.placeholder.com/400x300/8b5cf6/ffffff?text=DeFi',
  },
  {
    id: 3,
    title: 'NFT Gallery',
    description: 'A curated gallery for digital art with on-chain provenance.',
    tags: ['Next.js', 'IPFS', 'Tana'],
    image: 'https://via.placeholder.com/400x300/ec4899/ffffff?text=NFT',
  },
]

const skills = ['TypeScript', 'React', 'Node.js', 'Rust', 'Smart Contracts', 'PostgreSQL']

function ProjectCard({ title, description, tags, image }: typeof projects[0]) {
  return (
    <div className="bg-slate-800 rounded-xl overflow-hidden hover:ring-2 hover:ring-blue-500 transition-all cursor-pointer">
      <img src={image} alt={title} className="w-full h-48 object-cover" />
      <div className="p-6">
        <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
        <p className="text-slate-400 mb-4">{description}</p>
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span key={tag} className="px-3 py-1 bg-slate-700 text-slate-300 rounded-full text-sm">
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

export function App() {
  return (
    <div className="min-h-screen bg-slate-900">
      {/* Hero Section */}
      <header className="max-w-5xl mx-auto px-4 py-20 text-center">
        <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mx-auto mb-6" />
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Jane Developer</h1>
        <p className="text-xl text-slate-400 mb-8">Full-Stack Developer & Smart Contract Engineer</p>
        <div className="flex justify-center gap-4">
          <a href="#projects" className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            View Projects
          </a>
          <a href="#contact" className="px-6 py-3 border border-slate-600 text-white rounded-lg hover:border-slate-500 transition-colors">
            Contact Me
          </a>
        </div>
      </header>

      {/* Skills Section */}
      <section className="max-w-5xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold text-white mb-6 text-center">Skills</h2>
        <div className="flex flex-wrap justify-center gap-3">
          {skills.map((skill) => (
            <span key={skill} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg">
              {skill}
            </span>
          ))}
        </div>
      </section>

      {/* Projects Section */}
      <section id="projects" className="max-w-5xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold text-white mb-8 text-center">Projects</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <ProjectCard key={project.id} {...project} />
          ))}
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="max-w-5xl mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-bold text-white mb-4">Get In Touch</h2>
        <p className="text-slate-400 mb-8">I'm always open to new opportunities and collaborations.</p>
        <a href="mailto:jane@example.com" className="inline-block px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:opacity-90 transition-opacity">
          Say Hello
        </a>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800">
        <div className="max-w-5xl mx-auto px-4 py-6 text-center text-slate-500 text-sm">
          Built with Tana
        </div>
      </footer>
    </div>
  )
}
