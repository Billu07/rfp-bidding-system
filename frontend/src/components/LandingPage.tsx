// src/components/LandingPage.tsx
import { Link } from "react-router-dom";
import {
  Shield,
  Zap,
  Users,
  ArrowRight,
  CheckCircle,
  Star,
  TrendingUp,
} from "lucide-react";
import { useState, useEffect } from "react";

export default function LandingPage() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Navigation Bar */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg"></div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Atlas RFP
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                to="/login"
                className="text-gray-600 hover:text-blue-600 font-medium transition-colors duration-200"
              >
                Vendor Login
              </Link>
              <Link
                to="/admin/login"
                className="text-gray-600 hover:text-purple-600 font-medium transition-colors duration-200"
              >
                Admin Portal
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))]"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
          <div
            className={`text-center transition-all duration-700 ${
              isVisible
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-8"
            }`}
          >
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-blue-100 border border-blue-200 mb-8">
              <Star className="h-4 w-4 text-blue-600 mr-2" />
              <span className="text-sm font-medium text-blue-700">
                Trusted by 500+ Vendors Worldwide
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 tracking-tight leading-tight">
              Submit Winning
              <span className="block bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Proposals
              </span>
            </h1>

            <p className="mt-6 text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Join our exclusive vendor network. Complete one-time registration,
              sign the NDA, and gain access to premium RFPs from leading
              enterprises.
            </p>

            {/* Trust Badges */}
            <div className="mt-8 flex flex-wrap justify-center items-center gap-6 text-sm text-gray-500">
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                SOC 2 Certified
              </div>
              <div className="flex items-center">
                <Shield className="h-4 w-4 text-blue-500 mr-1" />
                Enterprise Security
              </div>
              <div className="flex items-center">
                <TrendingUp className="h-4 w-4 text-purple-500 mr-1" />
                95% Success Rate
              </div>
            </div>

            <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4">
              <Link
                to="/register"
                className="group inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
              >
                Start Registration
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                to="/login"
                className="group inline-flex items-center justify-center px-8 py-4 border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:border-blue-500 hover:text-blue-600 transition-all duration-300"
              >
                Access Your Account
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
              Why Join Our Network?
            </h2>
            <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
              We've streamlined the vendor onboarding process to save you time
              while maintaining the highest security standards.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
            <div className="group text-center p-8 rounded-2xl hover:shadow-xl transition-all duration-300 hover:transform hover:-translate-y-2">
              <div className="w-20 h-20 mx-auto bg-blue-100 rounded-2xl flex items-center justify-center group-hover:bg-blue-600 transition-colors duration-300">
                <Shield className="h-10 w-10 text-blue-600 group-hover:text-white transition-colors duration-300" />
              </div>
              <h3 className="mt-6 text-xl font-semibold text-gray-900">
                Enterprise Security
              </h3>
              <p className="mt-4 text-gray-600 leading-relaxed">
                Military-grade encryption and mandatory NDAs ensure your
                proprietary information remains confidential throughout the
                bidding process.
              </p>
            </div>

            <div className="group text-center p-8 rounded-2xl hover:shadow-xl transition-all duration-300 hover:transform hover:-translate-y-2">
              <div className="w-20 h-20 mx-auto bg-green-100 rounded-2xl flex items-center justify-center group-hover:bg-green-600 transition-colors duration-300">
                <Zap className="h-10 w-10 text-green-600 group-hover:text-white transition-colors duration-300" />
              </div>
              <h3 className="mt-6 text-xl font-semibold text-gray-900">
                Streamlined Process
              </h3>
              <p className="mt-4 text-gray-600 leading-relaxed">
                One-time registration gets you pre-approved for future RFPs.
                Submit proposals in minutes, not days.
              </p>
            </div>

            <div className="group text-center p-8 rounded-2xl hover:shadow-xl transition-all duration-300 hover:transform hover:-translate-y-2">
              <div className="w-20 h-20 mx-auto bg-purple-100 rounded-2xl flex items-center justify-center group-hover:bg-purple-600 transition-colors duration-300">
                <Users className="h-10 w-10 text-purple-600 group-hover:text-white transition-colors duration-300" />
              </div>
              <h3 className="mt-6 text-xl font-semibold text-gray-900">
                Quality Network
              </h3>
              <p className="mt-4 text-gray-600 leading-relaxed">
                Join an exclusive community of vetted vendors. No spam, no
                unqualified leads—just serious opportunities.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl sm:text-4xl font-bold">500+</div>
              <div className="text-blue-100 mt-2">Active Vendors</div>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-bold">$2B+</div>
              <div className="text-blue-100 mt-2">In Contracts</div>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-bold">24h</div>
              <div className="text-blue-100 mt-2">Avg. Response</div>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-bold">99.9%</div>
              <div className="text-blue-100 mt-2">Uptime</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
            Ready to Grow Your Business?
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            Join leading vendors who trust Atlas Consulting for premium RFP
            opportunities.
          </p>
          <div className="mt-8">
            <Link
              to="/register"
              className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
            >
              Get Started Today
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <div className="w-6 h-6 bg-gradient-to-r from-blue-400 to-purple-400 rounded"></div>
              <span className="text-lg font-bold">Atlas RFP Portal</span>
            </div>
            <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-400">
              <Link
                to="/privacy"
                className="hover:text-white transition-colors"
              >
                Privacy Policy
              </Link>
              <Link to="/terms" className="hover:text-white transition-colors">
                Terms of Service
              </Link>
              <Link
                to="/contact"
                className="hover:text-white transition-colors"
              >
                Contact
              </Link>
              <Link
                to="/admin/login"
                className="text-purple-300 hover:text-purple-200 transition-colors"
              >
                Admin Login
              </Link>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-800 text-center text-sm text-gray-400">
            <p>© 2025 Atlas Consulting. All rights reserved.</p>
            <p className="mt-2">Secure RFP Management Platform</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
