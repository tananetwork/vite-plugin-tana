import React from 'react'

const features = [
  {
    title: 'Lightning Fast',
    description: 'Built on cutting-edge technology for blazing fast performance.',
    icon: '⚡',
  },
  {
    title: 'Secure by Default',
    description: 'Enterprise-grade security with end-to-end encryption.',
    icon: '🔒',
  },
  {
    title: 'Easy Integration',
    description: 'Simple APIs that integrate with your existing workflow.',
    icon: '🔗',
  },
]

const testimonials = [
  {
    quote: "This platform transformed how we build applications. The developer experience is unmatched.",
    author: "Sarah Chen",
    role: "CTO at TechCorp",
  },
  {
    quote: "We shipped our product 3x faster thanks to the incredible tooling and documentation.",
    author: "Marcus Johnson",
    role: "Lead Developer at StartupXYZ",
  },
]

const stats = [
  { value: '10K+', label: 'Developers' },
  { value: '99.9%', label: 'Uptime' },
  { value: '50ms', label: 'Avg Response' },
  { value: '24/7', label: 'Support' },
]

export default function MarketingPage() {
  return (
    <div className="min-h-screen bg-slate-900">
      {/* Navigation */}
      <nav className="border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="text-xl font-bold text-white">YourBrand</div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-slate-400 hover:text-white transition-colors">Features</a>
            <a href="#testimonials" className="text-slate-400 hover:text-white transition-colors">Testimonials</a>
            <a href="#pricing" className="text-slate-400 hover:text-white transition-colors">Pricing</a>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-4 py-20 text-center">
        <div className="inline-block px-4 py-1 bg-blue-600/20 text-blue-400 rounded-full text-sm mb-6">
          Now in Public Beta
        </div>
        <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
          Build the Future<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
            One Block at a Time
          </span>
        </h1>
        <p className="text-xl text-slate-400 mb-8 max-w-2xl mx-auto">
          The next-generation platform for building decentralized applications.
          Ship faster with TypeScript smart contracts.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <button className="px-8 py-4 bg-blue-600 text-white rounded-lg text-lg font-medium hover:bg-blue-700 transition-colors">
            Start Building Free
          </button>
          <button className="px-8 py-4 border border-slate-600 text-white rounded-lg text-lg font-medium hover:border-slate-500 transition-colors">
            View Documentation
          </button>
        </div>
      </section>

      {/* Stats Section */}
      <section className="border-y border-slate-800 bg-slate-800/30">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-white mb-2">{stat.value}</div>
                <div className="text-slate-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="max-w-6xl mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white mb-4">Why Choose Us</h2>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Everything you need to build world-class applications, all in one platform.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature) => (
            <div key={feature.title} className="bg-slate-800 rounded-xl p-8 text-center hover:ring-2 hover:ring-blue-500/50 transition-all">
              <div className="text-4xl mb-4">{feature.icon}</div>
              <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
              <p className="text-slate-400">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="bg-slate-800/30 border-y border-slate-800">
        <div className="max-w-6xl mx-auto px-4 py-20">
          <h2 className="text-3xl font-bold text-white text-center mb-12">What Developers Say</h2>
          <div className="grid md:grid-cols-2 gap-8">
            {testimonials.map((testimonial, i) => (
              <div key={i} className="bg-slate-800 rounded-xl p-8">
                <p className="text-lg text-slate-300 mb-6 italic">"{testimonial.quote}"</p>
                <div>
                  <div className="font-semibold text-white">{testimonial.author}</div>
                  <div className="text-slate-400 text-sm">{testimonial.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-6xl mx-auto px-4 py-20 text-center">
        <h2 className="text-3xl font-bold text-white mb-4">Ready to Get Started?</h2>
        <p className="text-slate-400 mb-8 max-w-xl mx-auto">
          Join thousands of developers building the future of the decentralized web.
        </p>
        <button className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg text-lg font-medium hover:opacity-90 transition-opacity">
          Create Free Account
        </button>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-slate-400 text-sm">
              © 2024 YourBrand. All rights reserved.
            </div>
            <div className="flex gap-6">
              <a href="#" className="text-slate-400 hover:text-white transition-colors text-sm">Privacy</a>
              <a href="#" className="text-slate-400 hover:text-white transition-colors text-sm">Terms</a>
              <a href="#" className="text-slate-400 hover:text-white transition-colors text-sm">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
