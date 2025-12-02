import { useState, useEffect } from "react";
import axios from "axios";
import { API_BASE } from "../config/api";
import { format } from "date-fns";
import {
  MessageSquare,
  Send,
  Clock,
  CheckCircle,
  Search,
  User,
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
      fetchQuestions();
    } catch (error) {
      alert("Failed to submit answer.");
    }
  };

  const filteredQuestions = questions.filter((q) => {
    const vendorName = q.vendor?.name || ""; // SAFE CHECK HERE
    const matchesSearch =
      vendorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
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
      return format(new Date(dateString), "MMM d, h:mm a");
    } catch {
      return "Unknown";
    }
  };

  if (loading)
    return (
      <div className="text-center py-8 text-gray-500">Loading questions...</div>
    );

  return (
    <div className="space-y-6">
      {/* Stats Cards - Premium Look */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="bg-blue-50 p-3 rounded-lg text-blue-600">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Total Questions</p>
            <p className="text-2xl font-bold text-gray-900">
              {questions.length}
            </p>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="bg-orange-50 p-3 rounded-lg text-orange-600">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Pending Reply</p>
            <p className="text-2xl font-bold text-orange-600">
              {questions.filter((q) => !q.answer).length}
            </p>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="bg-green-50 p-3 rounded-lg text-green-600">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Answered</p>
            <p className="text-2xl font-bold text-green-600">
              {questions.filter((q) => q.answer).length}
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search questions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
        >
          <option value="all">All Status</option>
          <option value="unanswered">Pending Reply</option>
          <option value="answered">Answered</option>
        </select>
      </div>

      {/* List */}
      <div className="space-y-4">
        {filteredQuestions.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
            <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No questions found</p>
          </div>
        ) : (
          filteredQuestions.map((q) => (
            <div
              key={q.id}
              className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="p-5">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-start gap-3">
                    <div className="bg-gray-100 p-2 rounded-full">
                      <User className="w-5 h-5 text-gray-600" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900">
                        {q.companyName}
                      </h4>
                      <p className="text-sm text-gray-500">
                        {q.vendor?.name || "Unknown"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100 mb-1">
                      {q.step}
                    </span>
                    <p className="text-xs text-gray-400">
                      {formatDate(q.askedAt)}
                    </p>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 mb-4">
                  <p className="text-gray-800 text-sm leading-relaxed">
                    {q.question}
                  </p>
                </div>

                {q.answer ? (
                  <div className="pl-4 border-l-2 border-green-500">
                    <p className="text-xs font-bold text-green-700 mb-1 uppercase tracking-wider">
                      Your Response
                    </p>
                    <p className="text-gray-700 text-sm">{q.answer}</p>
                  </div>
                ) : (
                  <div className="flex justify-end">
                    <button
                      onClick={() => setAnsweringQuestion(q)}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition"
                    >
                      <Send className="w-4 h-4" /> Reply
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Answer Modal */}
      {answeringQuestion && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-scaleIn">
            <div className="p-6 border-b bg-gray-50">
              <h3 className="text-lg font-bold text-gray-900">
                Reply to Question
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                From {answeringQuestion.companyName}
              </p>
            </div>
            <div className="p-6">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-6">
                <p className="text-blue-900 font-medium text-sm mb-1">
                  Question:
                </p>
                <p className="text-blue-800 text-sm">
                  {answeringQuestion.question}
                </p>
              </div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Your Answer
              </label>
              <textarea
                value={answerText}
                onChange={(e) => setAnswerText(e.target.value)}
                rows={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Type your answer here..."
              />
            </div>
            <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setAnsweringQuestion(null)}
                className="px-5 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-white transition"
              >
                Cancel
              </button>
              <button
                onClick={handleAnswerSubmit}
                className="px-5 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition flex items-center gap-2"
              >
                <Send className="w-4 h-4" /> Send Reply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
