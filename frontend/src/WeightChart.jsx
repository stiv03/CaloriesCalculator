import React, { useState, useEffect } from "react";
import { Line } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from "chart.js";
import axios from "./axiosConfig";
import { getUserId, getToken } from "./utils/auth";
import "./WeightChart.css";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const WeightChart = () => {
  const [weightRecords, setWeightRecords] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [recordLimit, setRecordLimit] = useState(30); // По подразбиране: последните 30 записа

  useEffect(() => {
    const fetchWeightRecords = async () => {
      try {
        const userId = getUserId();
        const response = await axios.get(`/${userId}/weightRecords`, {
          headers: {
            'Authorization': `Bearer ${getToken()}`
          }
        });

        const sortedRecords = response.data.sort((a, b) => new Date(a.date) - new Date(b.date)); // Подреждаме по дата (най-старите първи)
        setWeightRecords(sortedRecords);
        filterRecords(sortedRecords, 30); // Първоначално показваме 30 записа
      } catch (error) {
        console.error("Error fetching weight records:", error);
      }
    };
    fetchWeightRecords();
  }, []);

  // Филтрира последните X на брой записа
  const filterRecords = (records, limit) => {
    const filtered = records.slice(-limit); // Взимаме последните "limit" записа
    setFilteredRecords(filtered);
  };

  // Обработва избора на лимит (брой записи)
  const handleLimitChange = (event) => {
    const selectedLimit = parseInt(event.target.value);
    setRecordLimit(selectedLimit);
    filterRecords(weightRecords, selectedLimit);
  };

  const chartData = {
    labels: filteredRecords.map(record => record.date),
    datasets: [
      {
        label: "Weight (kg)",
        data: filteredRecords.map(record => record.weight),
        borderColor: "#007bff",
        backgroundColor: "rgba(0, 123, 255, 0.2)",
        borderWidth: 2,
        pointRadius: 4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        title: {
          display: true,

        },
        ticks: {
          display: true, // Показваме датите
        },
      },
      y: {
        title: {
          display: true,
          text: "Weight (kg)",
        },
      },
    },
  };

  return (
    <div className="weight-chart-container">
      <div className="filter-container">
        <select value={recordLimit} onChange={handleLimitChange}>
          <option value={7}>Last 7 days</option>
          <option value={15}>Last 15 days</option>
          <option value={30}>Last 30 days</option>
          <option value={60}>Last 60 days</option>
          <option value={100}>Last 100 days</option>
        </select>
      </div>

      <div className="chart-wrapper">
        <h2 className="chart-title">Weight Progress</h2>
        <Line data={chartData} options={chartOptions} />
      </div>
    </div>
  );
};

export default WeightChart;
