import { useState, useEffect } from "react";
import axios from "axios";
import { API_BASE } from "../config/api";
import { format } from "date-fns";
import {
  MessageSquare,
  Send,
  Clock,
  CheckCircle,
  AlertCircle,
  Search,
} from "lucide-react";

interface Question {
  id: string;
  submissionId: string;
  vendor: { name: string; email: string };
  companyName: string;
  submittedAt: string;
  step: string;
  question: string;
  answer: string | null;
  askedAt: string;
  answeredAt: string | null;
  status: string;
  hasNewAnswer: boolean;
}

export default function AdminQuestionsPanel() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [answeringQuestion, setAnsweringQuestion] = useState<Question | null>(
    null
  );
  const [answerText, setAnswerText] = useState("");

  useEffect(() => {
    fetchQuestions();
    const interval = setInterval(fetchQuestions, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchQuestions = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/admin/questions`);
      if (response.data.success) {
        setQuestions(response.data.questions);
      }
    } catch (error) {
      console.error("Failed to fetch questions:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSubmit = async () => {
    if (!answeringQuestion || !answerText.trim()) return;

    try {
      await axios.post(`${API_BASE}/api/admin/answer-question`, {
        submissionId: answeringQuestion.submissionId,
        step: answeringQuestion.step,
        answer: answerText.trim(),
      });

      setAnsweringQuestion(null);
      setAnswerText("");
      fetchQuestions(); // Refresh the list
    } catch (error) {
      console.error("Failed to submit answer:", error);
      alert("Failed to submit answer. Please try again.");
    }
  };

  const filteredQuestions = questions.filter((q) => {
    const matchesSearch =
      q.vendor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.question.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter =
      filterStatus === "all" ||
      (filterStatus === "unanswered" && !q.answer) ||
      (filterStatus === "answered" && q.answer);

    return matchesSearch && matchesFilter;
  });

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "MMM d, yyyy 'at' h:mm a");
    } catch {
      return "Unknown date";
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading questions...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <div className="flex items-center gap-3">
            <MessageSquare className="w-8 h-8 text-blue-600" />
            <div>
              <p className="text-sm text-gray-600">Total Questions</p>
              <p className="text-2xl font-bold text-gray-900">
                {questions.length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <div className="flex items-center gap-3">
            <Clock className="w-8 h-8 text-orange-600" />
            <div>
              <p className="text-sm text-gray-600">Awaiting Reply</p>
              <p className="text-2xl font-bold text-orange-600">
                {questions.filter((q) => !q.answer).length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-green-600" />
            <div>
              <p className="text-sm text-gray-600">Answered</p>
              <p className="text-2xl font-bold text-green-600">
                {questions.filter((q) => q.answer).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search vendors, companies, or questions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Questions</option>
          <option value="unanswered">Awaiting Reply</option>
          <option value="answered">Answered</option>
        </select>
      </div>

      {/* Questions List */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
          {filteredQuestions.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No questions found</p>
            </div>
          ) : (
            filteredQuestions.map((question) => (
              <div
                key={question.id}
                className="p-6 hover:bg-gray-50 transition"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {question.companyName}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {question.vendor.name}
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        question.step === "Solution Fit & Use Cases"
                          ? "bg-purple-100 text-purple-800"
                          : question.step ===
                            "Technical Capabilities & Compliance"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-green-100 text-green-800"
                      }`}
                    >
                      {question.step}
                    </span>
                    <p className="text-sm text-gray-500 mt-1">
                      {formatDate(question.askedAt)}
                    </p>
                  </div>
                </div>

                <div className="mb-4">
                  <h4 className="font-medium text-gray-900 mb-2">Question:</h4>
                  <p className="text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded-lg">
                    {question.question}
                  </p>
                </div>

                {question.answer ? (
                  <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <h4 className="font-medium text-green-900">
                        Your Response
                      </h4>
                      <span className="text-sm text-green-600 ml-auto">
                        {formatDate(question.answeredAt!)}
                      </span>
                    </div>
                    <p className="text-green-800 whitespace-pre-wrap">
                      {question.answer}
                    </p>
                  </div>
                ) : (
                  <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-orange-600" />
                        <p className="text-orange-800">Awaiting response</p>
                      </div>
                      <button
                        onClick={() => setAnsweringQuestion(question)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
                      >
                        <Send className="w-4 h-4" />
                        Reply
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Answer Modal */}
      {answeringQuestion && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Reply to Question</h3>

            <div className="mb-4">
              <p className="font-medium text-gray-900">
                From: {answeringQuestion.vendor.name}
              </p>
              <p className="text-sm text-gray-600">
                Company: {answeringQuestion.companyName}
              </p>
              <p className="text-sm text-gray-600">
                Step: {answeringQuestion.step}
              </p>
            </div>

            <div className="mb-4">
              <h4 className="font-medium text-gray-900 mb-2">Question:</h4>
              <p className="text-gray-700 bg-gray-50 p-3 rounded-lg whitespace-pre-wrap">
                {answeringQuestion.question}
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Response
              </label>
              <textarea
                value={answerText}
                onChange={(e) => setAnswerText(e.target.value)}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Type your response here..."
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setAnsweringQuestion(null);
                  setAnswerText("");
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAnswerSubmit}
                disabled={!answerText.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                Send Response
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
