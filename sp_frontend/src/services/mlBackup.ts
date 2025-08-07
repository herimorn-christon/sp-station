import { SimpleLinearRegression } from 'ml-regression';

export interface SalesPrediction {
  predictedValue: number;
  confidence: number;
}

export interface AnomalyDetection {
  isAnomaly: boolean;
  score: number;
  threshold: number;
}

export class MLService {
  static async predictSales(historicalData: number[]): Promise<SalesPrediction> {
    const xValues = Array.from({ length: historicalData.length }, (_, i) => i);
    const regression = new SimpleLinearRegression(xValues, historicalData);
    const nextPoint = historicalData.length;
    const prediction = regression.predict(nextPoint);
    const confidence = regression.score(xValues, historicalData);

    return {
      predictedValue: prediction,
      confidence: Math.max(0, Math.min(1, confidence))
    };
  }

  static async detectAnomalies(data: number[], windowSize: number = 7): Promise<AnomalyDetection[]> {
    const results: AnomalyDetection[] = [];

    for (let i = windowSize; i < data.length; i++) {
      const window = data.slice(i - windowSize, i);
      const mean = window.reduce((a, b) => a + b) / windowSize;
      const std = Math.sqrt(
        window.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / windowSize
      );
      const zScore = Math.abs((data[i] - mean) / std);
      const threshold = 2;

      results.push({
        isAnomaly: zScore > threshold,
        score: zScore,
        threshold
      });
    }

    return results;
  }

  static async analyzeText(text: string): Promise<{
    urgency: number;
    category: string;
    keywords: string[];
  }> {
    const words = text.toLowerCase().split(/\s+/);
    const keywords = [...new Set(words)].filter(w => w.length > 3).slice(0, 5);

    const urgentWords = ['urgent', 'emergency', 'critical', 'immediate', 'dangerous'];
    const urgency = words.filter(word => urgentWords.includes(word)).length / words.length;

    const categories = {
      equipment: ['pump', 'nozzle', 'tank', 'meter'],
      safety: ['leak', 'spill', 'fire', 'hazard'],
      operational: ['slow', 'error', 'malfunction', 'broken']
    };

    let category = 'general';
    for (const [cat, catWords] of Object.entries(categories)) {
      if (words.some(word => catWords.includes(word))) {
        category = cat;
        break;
      }
    }

    return {
      urgency: Math.min(1, urgency * 2),
      category,
      keywords
    };
  }
}
