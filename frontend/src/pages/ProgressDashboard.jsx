import React, { useState, useEffect } from "react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { format, parseISO } from "date-fns";
import "../scss/ProgressDashboard.scss";

const ProgressDashboard = ({ userId = "default_user", onClose }) => {
  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [timeRange, setTimeRange] = useState("all");

  useEffect(() => {
    fetchDashboardData();
  }, [userId, selectedTopic, timeRange]);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("https://sih-backend-4fcb.onrender.com/performance-dashboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          topic: selectedTopic
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch dashboard data");
      }

      const data = await response.json();
      console.log("Dashboard data received:", data);
      
      if (data.success) {
        setDashboardData(data);
      } else {
        console.error("Error fetching dashboard data:", data.error);
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return "#4CAF50";
    if (score >= 60) return "#FF9800";
    return "#F44336";
  };

  const getScoreLabel = (score) => {
    if (score >= 80) return "Excellent";
    if (score >= 60) return "Good";
    return "Needs Improvement";
  };

  const formatDate = (dateString) => {
    try {
      console.log("Formatting date:", dateString, typeof dateString);
      if (!dateString) return "No Date";
      return format(parseISO(dateString), "MMM dd, yyyy");
    } catch (error) {
      console.error("Date formatting error:", error, "for date:", dateString);
      return "Invalid Date";
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="progress-dashboard">
        <div className="dashboard-loading">
          <div className="loading-spinner"></div>
          <h3>📊 Loading Your Progress...</h3>
          <p>Analyzing your learning journey</p>
        </div>
      </div>
    );
  }

  if (!dashboardData || dashboardData.total_quizzes === 0) {
    return (
      <div className="progress-dashboard">
        <div className="dashboard-empty">
          <div className="empty-icon">📚</div>
          <h3>No Progress Data Yet</h3>
          <p>Complete some quizzes to see your learning progress here!</p>
          <button className="btn-primary" onClick={onClose}>Start Learning</button>
        </div>
      </div>
    );
  }

  // Prepare chart data
  const topicScoresData = Object.entries(dashboardData.topic_scores || {}).map(([topic, score]) => ({
    topic: topic.length > 15 ? topic.substring(0, 15) + "..." : topic,
    score: Math.round(score),
    fullTopic: topic
  }));

  const recentAttemptsData = dashboardData.recent_attempts.slice(0, 10).map(attempt => ({
    date: formatDate(attempt.submitted_at),
    score: Math.round(attempt.score),
    topic: attempt.topic.length > 10 ? attempt.topic.substring(0, 10) + "..." : attempt.topic
  }));

  const performanceDistribution = [
    { name: "Excellent (80%+)", value: dashboardData.recent_attempts.filter(a => a.score >= 80).length, color: "#4CAF50" },
    { name: "Good (60-79%)", value: dashboardData.recent_attempts.filter(a => a.score >= 60 && a.score < 80).length, color: "#FF9800" },
    { name: "Needs Improvement (<60%)", value: dashboardData.recent_attempts.filter(a => a.score < 60).length, color: "#F44336" }
  ].filter(item => item.value > 0);

  return (
    <div className="progress-dashboard">
      <div className="dashboard-header">
        <h2>📊 Learning Progress Dashboard</h2>
        <div className="dashboard-controls">
          <select 
            value={selectedTopic || ""} 
            onChange={(e) => setSelectedTopic(e.target.value || null)}
            className="topic-filter"
          >
            <option value="">All Topics</option>
            {Object.keys(dashboardData.topic_scores || {}).map(topic => (
              <option key={topic} value={topic}>{topic}</option>
            ))}
          </select>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
      </div>

      <div className="dashboard-content">
        {/* Overview Cards */}
        <div className="overview-cards">
          <div className="stat-card">
            <div className="stat-icon">🎯</div>
            <div className="stat-content">
              <div className="stat-value">{dashboardData.total_quizzes}</div>
              <div className="stat-label">Total Quizzes</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">📈</div>
            <div className="stat-content">
              <div className="stat-value">{Math.round(dashboardData.average_score)}%</div>
              <div className="stat-label">Average Score</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">✅</div>
            <div className="stat-content">
              <div className="stat-value">{dashboardData.completion_percentage}%</div>
              <div className="stat-label">Completion</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">🏆</div>
            <div className="stat-content">
              <div className="stat-value">{dashboardData.strong_areas.length}</div>
              <div className="stat-label">Strong Areas</div>
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="charts-row">
          {/* Performance Distribution */}
          <div className="chart-container">
            <h3>📊 Performance Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={performanceDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {performanceDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Topic Performance */}
          <div className="chart-container">
            <h3>📚 Topic Performance</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topicScoresData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="topic" angle={-45} textAnchor="end" height={80} />
                <YAxis domain={[0, 100]} />
                <Tooltip 
                  formatter={(value) => [`${value}%`, 'Score']}
                  labelFormatter={(label, payload) => payload[0]?.payload?.fullTopic || label}
                />
                <Bar dataKey="score" fill="#007bff" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Performance Trend */}
        <div className="chart-container full-width">
          <h3>📈 Recent Performance Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={recentAttemptsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis domain={[0, 100]} />
              <Tooltip 
                formatter={(value) => [`${value}%`, 'Score']}
                labelFormatter={(label, payload) => payload[0]?.payload?.topic || label}
              />
              <Line type="monotone" dataKey="score" stroke="#007bff" strokeWidth={2} dot={{ fill: '#007bff', strokeWidth: 2, r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Areas Analysis */}
        <div className="areas-analysis">
          <div className="areas-section">
            <h3>💪 Strong Areas</h3>
            <div className="areas-list">
              {dashboardData.strong_areas.length > 0 ? (
                dashboardData.strong_areas.map((area, index) => (
                  <div key={index} className="area-item strong">
                    <span className="area-icon">✅</span>
                    <span className="area-name">{area}</span>
                    <span className="area-score">{Math.round(dashboardData.topic_scores[area])}%</span>
                  </div>
                ))
              ) : (
                <p className="no-areas">Keep practicing to identify your strong areas!</p>
              )}
            </div>
          </div>

          <div className="areas-section">
            <h3>🎯 Areas for Improvement</h3>
            <div className="areas-list">
              {dashboardData.weak_areas.length > 0 ? (
                dashboardData.weak_areas.map((area, index) => (
                  <div key={index} className="area-item weak">
                    <span className="area-icon">📚</span>
                    <span className="area-name">{area}</span>
                    <span className="area-score">{Math.round(dashboardData.topic_scores[area])}%</span>
                  </div>
                ))
              ) : (
                <p className="no-areas">Great job! No weak areas identified.</p>
              )}
            </div>
          </div>
        </div>

        {/* Recommendations */}
        <div className="recommendations-section">
          <h3>💡 Recommendations</h3>
          <div className="recommendations-list">
            {dashboardData.recommendations.length > 0 ? (
              dashboardData.recommendations.map((recommendation, index) => (
                <div key={index} className="recommendation-item">
                  <span className="recommendation-icon">💡</span>
                  <span className="recommendation-text">{recommendation}</span>
                </div>
              ))
            ) : (
              <p className="no-recommendations">Keep up the great work!</p>
            )}
          </div>
        </div>

        {/* Recent Attempts */}
        <div className="recent-attempts">
          <h3>📋 Recent Quiz Attempts</h3>
          <div className="attempts-list">
            {dashboardData.recent_attempts.slice(0, 5).map((attempt, index) => (
              <div key={index} className="attempt-item">
                <div className="attempt-header">
                  <span className="attempt-topic">{attempt.topic}</span>
                  <span className="attempt-date">{formatDate(attempt.submitted_at)}</span>
                </div>
                <div className="attempt-details">
                  <div className="attempt-score" style={{ color: getScoreColor(attempt.score) }}>
                    {Math.round(attempt.score)}% - {getScoreLabel(attempt.score)}
                  </div>
                  <div className="attempt-stats">
                    <span>{attempt.correct_answers}/{attempt.total_questions} correct</span>
                    <span>⏱️ {formatTime(attempt.time_spent)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProgressDashboard;
