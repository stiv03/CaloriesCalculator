import React from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import './MeasurementChart.css';

// Register necessary chart components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const MeasurementChart = ({ measurementRecords }) => {
  if (!measurementRecords || measurementRecords.length === 0) {
    return <p>No measurement records available.</p>;
  }

  // Sort measurements by date (ensure oldest comes first, latest last)
  const sortedRecords = [...measurementRecords].sort((a, b) => new Date(a.date) - new Date(b.date));

  // Extracting labels (dates) and datasets (measurements)
  const labels = sortedRecords.map(record => new Date(record.date).toLocaleDateString());

  const data = {
    labels,
    datasets: [
      {
        label: 'Shoulder (cm)',
        data: sortedRecords.map(record => record.shoulder),
        borderColor: 'rgba(255, 99, 132, 1)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
      },
      {
        label: 'Chest (cm)',
        data: sortedRecords.map(record => record.chest),
        borderColor: 'rgba(54, 162, 235, 1)',
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
      },
      {
        label: 'Biceps (cm)',
        data: sortedRecords.map(record => record.biceps),
        borderColor: 'rgba(75, 192, 192, 1)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
      },
      {
        label: 'Waist (cm)',
        data: sortedRecords.map(record => record.waist),
        borderColor: 'rgba(255, 206, 86, 1)',
        backgroundColor: 'rgba(255, 206, 86, 0.2)',
      },
      {
        label: 'Hips (cm)',
        data: sortedRecords.map(record => record.hips),
        borderColor: 'rgba(153, 102, 255, 1)',
        backgroundColor: 'rgba(153, 102, 255, 0.2)',
      },
      {
        label: 'Thigh (cm)',
        data: sortedRecords.map(record => record.thigh),
        borderColor: 'rgba(255, 159, 64, 1)',
        backgroundColor: 'rgba(255, 159, 64, 0.2)',
      },
      {
        label: 'Calf (cm)',
        data: sortedRecords.map(record => record.calf),
        borderColor: 'rgba(99, 255, 132, 1)',
        backgroundColor: 'rgba(99, 255, 132, 0.2)',
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,

      },
    },
    scales: {
      x: {
        reverse: false, // Ensure left-to-right order
        ticks: {
          align: 'end', // Make sure it doesn't mess up alignment
        },
      },
      y: {
        beginAtZero: false,
        title: {
          display: true,
          text: "Size (cm)",
        },
      },
    },
  };

  return (
    <div className="measurement-chart-container">
      <div className="chartM-wrapper">
        <h2 className="chartM-title">Body Measurements Over Time</h2>
        <Line data={data} options={options} />
      </div>
    </div>
  );
};

export default MeasurementChart;
