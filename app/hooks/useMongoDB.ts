import { useState } from "react";

const useMongoDB = (confirmedSubject: string) => {
  const [historicalData, setHistoricalData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchHistoricalData = async () => {
    if (!confirmedSubject) {
      setHistoricalData(null);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/last-access?subjectId=${confirmedSubject}`);
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `HTTP error! Status: ${response.status}`);
      }
      const data = await response.json();
      setHistoricalData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const pushDataToMongo = async (recordData) => {
    const payload = { ...recordData, subjectId: confirmedSubject || 'unknown' };
    const response = await fetch('/api/save-record', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || "Failed to save data");
    }
    return result;
  };

  return { historicalData, loading, error, fetchHistoricalData, pushDataToMongo };
};

export default useMongoDB;