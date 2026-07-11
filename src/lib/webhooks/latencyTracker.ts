/**
 * Webhook Latency Tracker
 * Measures and tracks webhook processing latency across different stages
 * Provides SLA monitoring and performance analytics
 */

export interface LatencyMeasurements {
  totalLatency: number; // End-to-end latency
  signatureVerification: number;
  processing: number;
  persistence: number;
  other: number;
}

export interface LatencyMetrics {
  provider: string;
  eventType: string;
  measurements: {
    count: number;
    total: number;
    average: number;
    min: number;
    max: number;
    p50: number;
    p95: number;
    p99: number;
  };
  slaBreach: boolean;
  slaBreachus: number; // Count of events exceeding 2s SLA
}

/**
 * High-resolution latency tracking for webhook processing
 */
export class LatencyTracker {
  private measurements: Map<string, number[]> = new Map();
  private readonly SLA_THRESHOLD_MS = 2000; // 2 second SLA

  /**
   * Start latency measurement
   * @returns High-resolution timestamp from performance.now()
   */
  startMeasurement(): number {
    return performance.now();
  }

  /**
   * End latency measurement and record it
   * @param startTime - Start timestamp from startMeasurement()
   * @param provider - Webhook provider name
   * @param eventType - Webhook event type
   * @param stage - Processing stage (total, signature, processing, persistence)
   * @returns Breakdown of latency measurements or null on error
   */
  endMeasurement(
    startTime: number,
    provider: string,
    eventType: string,
    stage: 'total' | 'signature' | 'processing' | 'persistence' = 'total'
  ): LatencyMeasurements | null {
    const endTime = performance.now();
    const latency = Math.round(endTime - startTime);

    const key = `${provider}:${eventType}:${stage}`;
    if (!this.measurements.has(key)) {
      this.measurements.set(key, []);
    }

    const measurements = this.measurements.get(key);
    if (measurements) {
      measurements.push(latency);

      // Keep only last 10000 measurements in memory to prevent bloat
      if (measurements.length > 10000) {
        measurements.shift();
      }
    }

    return {
      totalLatency: latency,
      signatureVerification: 0,
      processing: 0,
      persistence: 0,
      other: 0,
    };
  }

  /**
   * Record complete latency breakdown for a webhook
   * @param provider - Webhook provider name
   * @param eventType - Webhook event type
   * @param breakdown - Latency breakdown by stage
   * @returns Combined latency measurements
   */
  recordWebhookLatency(
    provider: string,
    eventType: string,
    breakdown: {
      signatureVerification: number;
      processing: number;
      persistence: number;
      other?: number;
    }
  ): LatencyMeasurements {
    const total =
      breakdown.signatureVerification +
      breakdown.processing +
      breakdown.persistence +
      (breakdown.other || 0);

    // Record individual measurements
    this.recordMeasurement(`${provider}:${eventType}:signature`, breakdown.signatureVerification);
    this.recordMeasurement(`${provider}:${eventType}:processing`, breakdown.processing);
    this.recordMeasurement(`${provider}:${eventType}:persistence`, breakdown.persistence);
    this.recordMeasurement(`${provider}:${eventType}:total`, total);

    return {
      totalLatency: total,
      signatureVerification: breakdown.signatureVerification,
      processing: breakdown.processing,
      persistence: breakdown.persistence,
      other: breakdown.other || 0,
    };
  }

  /**
   * Record a single latency measurement
   * @param key - Measurement key (provider:eventType:stage)
   * @param latency - Latency in milliseconds
   */
  private recordMeasurement(key: string, latency: number): void {
    if (!this.measurements.has(key)) {
      this.measurements.set(key, []);
    }

    const measurements = this.measurements.get(key);
    if (measurements) {
      measurements.push(latency);

      // Keep memory bounded
      if (measurements.length > 10000) {
        measurements.shift();
      }
    }
  }

  /**
   * Get latency metrics for a provider/eventType combination
   * @param provider - Webhook provider name
   * @param eventType - Webhook event type
   * @param stage - Processing stage to retrieve metrics for
   * @returns Latency metrics including percentiles and SLA compliance
   */
  getMetrics(
    provider: string,
    eventType: string,
    stage: 'total' | 'signature' | 'processing' | 'persistence' = 'total'
  ): LatencyMetrics {
    const key = `${provider}:${eventType}:${stage}`;
    const measurements = this.measurements.get(key) || [];

    if (measurements.length === 0) {
      return {
        provider,
        eventType,
        measurements: {
          count: 0,
          total: 0,
          average: 0,
          min: 0,
          max: 0,
          p50: 0,
          p95: 0,
          p99: 0,
        },
        slaBreach: false,
        slaBreachus: 0,
      };
    }

    // Sort for percentile calculation
    const sorted = [...measurements].sort((a, b) => a - b);

    const slaBreachus = measurements.filter(m => m > this.SLA_THRESHOLD_MS).length;
    const total = measurements.reduce((a, b) => a + b, 0);
    const average = Math.round(total / measurements.length);

    return {
      provider,
      eventType,
      measurements: {
        count: measurements.length,
        total,
        average,
        min: sorted[0] ?? 0,
        max: sorted[sorted.length - 1] ?? 0,
        p50: sorted[Math.floor(sorted.length * 0.5)] ?? 0,
        p95: sorted[Math.floor(sorted.length * 0.95)] ?? 0,
        p99: sorted[Math.floor(sorted.length * 0.99)] ?? 0,
      },
      slaBreach: slaBreachus > 0,
      slaBreachus,
    };
  }

  /**
   * Get all metrics across all providers and event types
   * @returns Array of latency metrics for all provider/event combinations
   */
  getAllMetrics(): LatencyMetrics[] {
    const metricsByProvider: Record<string, LatencyMetrics> = {};

    for (const key of this.measurements.keys()) {
      const [provider, eventType] = key.split(':');
      if (!provider || !eventType) continue;

      const compositeKey = `${provider}:${eventType}`;
      if (!metricsByProvider[compositeKey]) {
        metricsByProvider[compositeKey] = this.getMetrics(provider, eventType);
      }
    }

    return Object.values(metricsByProvider);
  }

  /**
   * Get SLA compliance report with recommendations
   * @returns SLA compliance metrics with breakdown by provider
   */
  getSLAReport(): {
    totalEvents: number;
    slaBreachus: number;
    slaBreakedRate: string;
    byProvider: Record<
      string,
      {
        totalEvents: number;
        slaBreachus: number;
        slaBreakedRate: string;
      }
    >;
    recommendations: string[];
  } {
    const allMetrics = this.getAllMetrics();

    const totalEvents = allMetrics.reduce((sum, m) => sum + m.measurements.count, 0);
    const slaBreachus = allMetrics.reduce((sum, m) => sum + m.slaBreachus, 0);
    const slaBreakedRate = totalEvents > 0 ? ((slaBreachus / totalEvents) * 100).toFixed(2) : '0';

    const byProvider: Record<string, any> = {};
    for (const metrics of allMetrics) {
      const providerKey = metrics.provider;
      if (!byProvider[providerKey]) {
        byProvider[providerKey] = {
          totalEvents: 0,
          slaBreachus: 0,
        };
      }
      byProvider[providerKey].totalEvents += metrics.measurements.count;
      byProvider[providerKey].slaBreachus += metrics.slaBreachus;
    }

    // Calculate rates
    for (const provider in byProvider) {
      const stats = byProvider[provider];
      stats.slaBreakedRate =
        stats.totalEvents > 0 ? ((stats.slaBreachus / stats.totalEvents) * 100).toFixed(2) : '0';
    }

    // Generate recommendations
    const recommendations: string[] = [];
    if (parseFloat(slaBreakedRate) > 5) {
      recommendations.push('SLA breach rate exceeds 5%. Consider optimizing webhook handlers.');
    }

    for (const provider in byProvider) {
      const stats = byProvider[provider];
      if (parseFloat(stats.slaBreakedRate) > 10) {
        recommendations.push(
          `${provider}: High SLA breach rate (${stats.slaBreakedRate}%). Investigate handler performance.`
        );
      }
    }

    if (recommendations.length === 0) {
      recommendations.push('SLA compliance within acceptable levels.');
    }

    return {
      totalEvents,
      slaBreachus,
      slaBreakedRate: slaBreakedRate + '%',
      byProvider,
      recommendations,
    };
  }

  /**
   * Export metrics as JSON for external monitoring systems
   * @returns JSON-serializable metrics including SLA summary and raw measurements
   */
  exportMetrics() {
    return {
      timestamp: new Date().toISOString(),
      slaSummary: this.getSLAReport(),
      metrics: this.getAllMetrics(),
      measurements: Array.from(this.measurements.entries()).map(([key, latencies]) => ({
        key,
        count: latencies.length,
        average: Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length),
        min: Math.min(...latencies),
        max: Math.max(...latencies),
      })),
    };
  }

  /**
   * Reset all measurements (useful for testing or periodic cleanup)
   */
  reset(): void {
    this.measurements.clear();
  }

  /**
   * Get percentile for a value
   * @param provider - Webhook provider name
   * @param eventType - Webhook event type
   * @param latency - Latency value in milliseconds
   * @returns Percentile (0-100) of the given latency
   */
  getPercentile(provider: string, eventType: string, latency: number): number {
    const key = `${provider}:${eventType}:total`;
    const measurements = this.measurements.get(key) || [];

    if (measurements.length === 0) return 0;

    const sorted = [...measurements].sort((a, b) => a - b);
    const count = sorted.filter(m => m <= latency).length;

    return (count / sorted.length) * 100;
  }
}

// Export singleton instance
export const latencyTracker = new LatencyTracker();
