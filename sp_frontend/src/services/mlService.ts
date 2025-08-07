// Simple ML Service for priority prediction
export class MLService {
  predictPriority(description: string): string {
    const lowercaseDesc = description.toLowerCase();
    
    // Emergency keywords
    if (lowercaseDesc.includes('fire') || 
        lowercaseDesc.includes('explosion') || 
        lowercaseDesc.includes('leak') || 
        lowercaseDesc.includes('emergency')) {
      return 'critical';
    }
    
    // High priority keywords
    if (lowercaseDesc.includes('pump') || 
        lowercaseDesc.includes('electrical') || 
        lowercaseDesc.includes('safety')) {
      return 'high';
    }
    
    // Medium priority keywords
    if (lowercaseDesc.includes('maintenance') || 
        lowercaseDesc.includes('repair')) {
      return 'medium';
    }
    
    // Default to low priority
    return 'low';
  }
}