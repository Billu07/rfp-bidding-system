import { useState, useEffect } from "react";
import axios from "axios";
import { API_BASE } from "../config/api";
import { format } from "date-fns";
import {
  MessageSquare,
  CheckCircle,
  Clock,
  Mail,
  HelpCircle,
  ThumbsUp,
} from "lucide-react";

interface Question {
  id: string;
  submissionId: string;
  companyName: string;
  submittedAt: string;
  step: string;
  question: string;
  answer: string | null;
  askedAt: string;
  answeredAt: string | null;
  hasNewAnswer: boolean;
}

export default function VendorQuestions() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "unanswered" | "answered">(
    "all"
  );

  useEffect(() => {
    fetchQuestions();
    // Poll for new answers every 30 seconds
    const interval = setInterval(fetchQuestions, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchQuestions = async () => {
    try {
      const vendor = localStorage.getItem("vendor");
      if (!vendor) return;

      const headers = { "X-Vendor-Data": vendor };
      const response = await axios.get(`${API_BASE}/api/vendor/questions`, {
        headers,
      });
      if (response.data.success) {
        setQuestions(response.data.questions);
        setUnreadCount(response.data.unreadCount);
      }
    } catch (error) {
      console.error("Failed to fetch questions:", error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async () => {
    try {
      const vendor = localStorage.getItem("vendor");
      if (!vendor) return;

      const headers = { "X-Vendor-Data": vendor };
      await axios.post(
        `${API_BASE}/api/vendor/mark-questions-read`,
        {},
        { headers }
      );
      setUnreadCount(0);
      // Update local state to remove new answer indicators
      setQuestions(questions.map((q) => ({ ...q, hasNewAnswer: false })));
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  };

  const filteredQuestions = questions.filter((q) => {
    if (activeTab === "unanswered") return !q.answer;
    if (activeTab === "answered") return q.answer;
    return true;
  });

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "MMM d, yyyy 'at' h:mm a");
    } catch {
      return "Unknown date";
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              RFP Questions & Answers
            </h3>
            <p className="text-sm text-gray-600">
              Communicate with the RFP team about your submission
            </p>
          </div>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={markAsRead}
            className="flex items-center gap-2 px-3 py-2 bg-green-100 text-green-800 rounded-lg text-sm font-medium hover:bg-green-200 transition"
          >
            <Mail className="w-4 h-4" />
            {unreadCount} new {unreadCount === 1 ? "reply" : "replies"}
            <ThumbsUp className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab("all")}
          className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition ${
            activeTab === "all"
              ? "border-blue-500 text-blue-600 bg-blue-50"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          All Questions ({questions.length})
        </button>
        <button
          onClick={() => setActiveTab("unanswered")}
          className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition ${
            activeTab === "unanswered"
              ? "border-orange-500 text-orange-600 bg-orange-50"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Waiting Reply ({questions.filter((q) => !q.answer).length})
        </button>
        <button
          onClick={() => setActiveTab("answered")}
          className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition ${
            activeTab === "answered"
              ? "border-green-500 text-green-600 bg-green-50"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Answered ({questions.filter((q) => q.answer).length})
        </button>
      </div>

      {/* Questions List */}
      <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
        {filteredQuestions.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">
              {activeTab === "unanswered"
                ? "No questions waiting for reply"
                : activeTab === "answered"
                ? "No answered questions yet"
                : "No questions asked yet"}
            </p>
          </div>
        ) : (
          filteredQuestions.map((question) => (
            <div key={question.id} className="p-6 hover:bg-gray-50 transition">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
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
                  {question.hasNewAnswer && (
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      New Reply
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-500">
                  {formatDate(question.askedAt)}
                </div>
              </div>

              {/* Question */}
              <div className="mb-4">
                <div className="flex items-start gap-3 mb-2">
                  <HelpCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-gray-900">Your Question</h4>
                    <p className="text-gray-700 mt-1 whitespace-pre-wrap">
                      {question.question}
                    </p>
                  </div>
                </div>
              </div>

              {/* Answer */}
              {question.answer && (
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium text-green-900">
                          RFP Team Response
                        </h4>
                        {question.answeredAt && (
                          <span className="text-sm text-green-600">
                            {formatDate(question.answeredAt)}
                          </span>
                        )}
                      </div>
                      <p className="text-green-800 whitespace-pre-wrap">
                        {question.answer}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {!question.answer && (
                <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-orange-600 flex-shrink-0" />
                    <div>
                      <p className="text-orange-800 text-sm">
                        Your question is awaiting response from the RFP team.
                        They typically respond within 1-2 business days.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-4 bg-gray-50 border-t border-gray-200">
        <p className="text-sm text-gray-600 text-center">
          Questions are tied to your submission. You can ask questions during
          the submission process.
        </p>
      </div>
    </div>
  );
}
