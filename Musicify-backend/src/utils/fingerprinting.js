import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const FFT = require('fft.js');

/**
 * Generate audio fingerprints from audio samples
 * @param {Float32Array} audioData - Audio samples
 * @returns {Array} Array of fingerprint objects
 */
export const generateFingerprint = (audioData) => {
  console.log("Starting fingerprint generation...");
  console.log(`Sample length: ${audioData.length}`);
  
  const startTime = Date.now();
  
  // Constants for audio processing
  const SAMPLE_RATE = 44100;
  const WINDOW_SIZE = 2048;
  const OVERLAP = 0.5;
  
  // Frequency ranges for fingerprinting
  const FREQ_BANDS = [
    [40, 80],
    [80, 120],
    [120, 180],
    [180, 300]
  ];
  
  const fingerprints = [];
  
  // Initialize FFT
  const fft = new FFT(WINDOW_SIZE);
  const out = new Float32Array(WINDOW_SIZE * 2);
  
  // Apply Hann window to reduce spectral leakage
  const applyHannWindow = (signal) => {
    const windowed = new Float32Array(signal.length);
    for (let i = 0; i < signal.length; i++) {
      const multiplier = 0.5 * (1 - Math.cos(2 * Math.PI * i / (signal.length - 1)));
      windowed[i] = signal[i] * multiplier;
    }
    return windowed;
  };
  
  // Perform FFT using the library
  const performFFT = (signal) => {
    // Prepare input for FFT (real and imaginary parts)
    const complexSignal = new Float32Array(WINDOW_SIZE * 2);
    for (let i = 0; i < WINDOW_SIZE; i++) {
      complexSignal[2 * i] = signal[i];
      complexSignal[2 * i + 1] = 0; // Imaginary part is zero
    }
    
    // Perform FFT
    fft.transform(out, complexSignal);
    
    // Convert to magnitude spectrum
    const magnitudeSpectrum = new Float32Array(WINDOW_SIZE / 2);
    for (let i = 0; i < WINDOW_SIZE / 2; i++) {
      const real = out[2 * i];
      const imag = out[2 * i + 1];
      magnitudeSpectrum[i] = Math.sqrt(real * real + imag * imag);
    }
    
    return magnitudeSpectrum;
  };
  
  // Find frequency peaks in spectrum
  const findPeaks = (spectrum) => {
    const peaks = [];
    
    FREQ_BANDS.forEach(([lowFreq, highFreq]) => {
      const lowBin = Math.floor(lowFreq * WINDOW_SIZE / SAMPLE_RATE);
      const highBin = Math.ceil(highFreq * WINDOW_SIZE / SAMPLE_RATE);
      
      let maxAmp = 0;
      let maxFreq = 0;
      
      for (let bin = lowBin; bin < highBin; bin++) {
        if (spectrum[bin] > maxAmp) {
          maxAmp = spectrum[bin];
          maxFreq = bin * SAMPLE_RATE / WINDOW_SIZE;
        }
      }
      
      if (maxAmp > 0) {
        peaks.push({ frequency: maxFreq, amplitude: maxAmp });
      }
    });
    
    return peaks;
  };
  
  // Log progress periodically
  const totalChunks = Math.floor((audioData.length - WINDOW_SIZE) / (WINDOW_SIZE * (1 - OVERLAP)));
  const logInterval = Math.max(1, Math.floor(totalChunks / 10)); // Log 10 times during processing
  
  // Process audio in overlapping chunks
  for (let i = 0, chunkCount = 0; i < audioData.length - WINDOW_SIZE; i += Math.floor(WINDOW_SIZE * (1 - OVERLAP)), chunkCount++) {
    const chunk = audioData.slice(i, i + WINDOW_SIZE);
    const windowed = applyHannWindow(chunk);
    const spectrum = performFFT(windowed);
    
    // Find peaks in frequency bands
    const peaks = findPeaks(spectrum);
    
    if (peaks.length > 0) {
      fingerprints.push({
        timeOffset: i / SAMPLE_RATE,
        frequencies: peaks.map(p => p.frequency),
        amplitudes: peaks.map(p => p.amplitude)
      });
    }
    
    // Log progress periodically
    if (chunkCount % logInterval === 0 || chunkCount === totalChunks - 1) {
      console.log(`Fingerprint generation: ${Math.round((chunkCount / totalChunks) * 100)}% complete (${chunkCount}/${totalChunks} chunks)`);
    }
  }
  
  const duration = (Date.now() - startTime) / 1000;
  console.log(`Generated ${fingerprints.length} fingerprints in ${duration.toFixed(2)} seconds`);
  return fingerprints;
};

/**
 * Match fingerprints between sample and stored song
 * @param {Array} queryFingerprints - Fingerprints from the sample
 * @param {Array} dbFingerprints - Fingerprints from the stored song
 * @returns {Array} Array of match objects with scores
 */
export const matchFingerprints = (queryFingerprints, dbFingerprints) => {
  console.log(`Starting fingerprint matching: ${queryFingerprints.length} sample fingerprints vs ${dbFingerprints.length} song fingerprints`);
  const startTime = Date.now();
  
  // Early optimization: if either set is empty, return no match
  if (!queryFingerprints.length || !dbFingerprints.length) {
    return [{ offset: 0, count: 0, score: 0, consecutive: 0, confidence: 0 }];
  }
  
  // Index dbFingerprints by frequency hash for faster lookup
  const dbIndex = new Map();
  
  // Create a simple hash of frequencies for faster matching
  const hashFrequencies = (freqs) => {
    // Round frequencies to nearest 5Hz to allow for small variations
    return freqs.map(f => Math.round(f / 5) * 5).join(',');
  };
  
  // Build index of database fingerprints
  dbFingerprints.forEach((fp, index) => {
    const hash = hashFrequencies(fp.frequencies);
    if (!dbIndex.has(hash)) {
      dbIndex.set(hash, []);
    }
    dbIndex.get(hash).push({ index, timeOffset: fp.timeOffset });
  });
  
  const timeDiffs = new Map();
  let totalComparisons = 0;
  let actualComparisons = 0;
  
  // Process each query fingerprint
  for (let i = 0; i < queryFingerprints.length; i++) {
    const queryFp = queryFingerprints[i];
    const queryHash = hashFrequencies(queryFp.frequencies);
    
    // Find potential matches using the hash index
    const potentialMatches = dbIndex.get(queryHash) || [];
    totalComparisons += dbFingerprints.length; // For logging only
    actualComparisons += potentialMatches.length;
    
    // Process potential matches
    potentialMatches.forEach(match => {
      const j = match.index;
      const dbFp = dbFingerprints[j];
      
      // Do a more detailed comparison only for potential matches
      const freqMatch = compareFrequencies(queryFp.frequencies, dbFp.frequencies);
      
      if (freqMatch > 0.6) { // 60% frequency match threshold
        const timeDiff = dbFp.timeOffset - queryFp.timeOffset;
        const roundedDiff = Math.round(timeDiff * 10) / 10; // Round to nearest 0.1s
        
        if (!timeDiffs.has(roundedDiff)) {
          timeDiffs.set(roundedDiff, { count: 0, score: 0, matches: [] });
        }
        
        const diffData = timeDiffs.get(roundedDiff);
        diffData.count++;
        diffData.score += freqMatch;
        diffData.matches.push({
          queryIndex: i,
          dbIndex: j,
          score: freqMatch
        });
      }
    });
    
    // Log progress every 10%
    if (i % Math.max(1, Math.floor(queryFingerprints.length / 10)) === 0) {
      const percent = Math.round((i / queryFingerprints.length) * 100);
      console.log(`Fingerprint matching: ${percent}% complete (${i}/${queryFingerprints.length})`);
    }
  }
  
  console.log(`Performed ${actualComparisons} actual comparisons out of ${totalComparisons} potential comparisons (${Math.round((actualComparisons/totalComparisons)*100)}% efficiency)`);
  
  // Find the best time difference
  let bestDiff = null;
  let bestScore = 0;
  
  timeDiffs.forEach((data, diff) => {
    // Calculate consecutive matches
    let maxConsecutive = 0;
    let currentConsecutive = 0;
    
    // Sort matches by query index
    const sortedMatches = [...data.matches].sort((a, b) => a.queryIndex - b.queryIndex);
    
    for (let i = 0; i < sortedMatches.length; i++) {
      if (i > 0 && sortedMatches[i].queryIndex === sortedMatches[i-1].queryIndex + 1 &&
          sortedMatches[i].dbIndex === sortedMatches[i-1].dbIndex + 1) {
        currentConsecutive++;
      } else {
        currentConsecutive = 1;
      }
      maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
    }
    
    // Calculate weighted score with proper bounds
    const weightedScore = 
        (data.score * 0.4) + 
        (data.count * 0.3) + 
        (maxConsecutive * 0.3);
    
    if (weightedScore > bestScore) {
        bestScore = weightedScore;
        
        // Improved confidence calculation with proper bounds
        const matchRatio = Math.min(1, data.count / queryFingerprints.length);
        const consecutiveWeight = Math.min(1, maxConsecutive / 10);
        const avgMatchQuality = data.count > 0 ? Math.min(1, data.score / data.count) : 0;
        
        // Combine factors with appropriate weights
        const rawConfidence = 
            (matchRatio * 0.5) + 
            (consecutiveWeight * 0.3) + 
            (avgMatchQuality * 0.2);
        
        // Apply sigmoid-like function with proper bounds
        const normalizedConfidence = Math.min(0.99, Math.max(0, 
            rawConfidence < 0.5 
                ? rawConfidence * 0.8
                : 0.4 + (rawConfidence - 0.5) * 1.2
        ));
        
        bestDiff = {
            offset: diff,
            count: data.count,
            score: data.score,
            consecutive: maxConsecutive,
            matches: data.matches.length,
            confidence: normalizedConfidence // Properly bounded between 0 and 0.99
        };
    }
  });
  
  const duration = (Date.now() - startTime) / 1000;
  console.log(`Fingerprint matching completed in ${duration.toFixed(2)} seconds`);
  
  if (bestDiff) {
    console.log(`Best match: offset=${bestDiff.offset}, count=${bestDiff.count}, confidence=${bestDiff.confidence.toFixed(4)}`);
    return [bestDiff];
  } else {
    console.log("No matches found");
    return [{ offset: 0, count: 0, score: 0, consecutive: 0, confidence: 0 }];
  }
};

/**
 * Compare two sets of frequencies for matching
 * @param {Array} freqs1 - First set of frequencies
 * @param {Array} freqs2 - Second set of frequencies
 * @returns {number} Match score between 0 and 1
 */
const compareFrequencies = (freqs1, freqs2) => {
  if (freqs1.length !== freqs2.length) {
    return 0;
  }
  
  let matches = 0;
  let totalWeight = 0;
  
  for (let i = 0; i < freqs1.length; i++) {
    const freq1 = freqs1[i];
    const freq2 = freqs2[i];
    
    // Calculate frequency difference as a percentage
    const diff = Math.abs(freq1 - freq2);
    const avgFreq = (freq1 + freq2) / 2;
    const percentDiff = avgFreq > 0 ? diff / avgFreq : 1;
    
    // Consider a match if within 15% difference
    if (percentDiff < 0.15) {
      // Weight by how close the match is
      const weight = 1 - (percentDiff / 0.15);
      matches += weight;
    }
    
    totalWeight++;
  }
  
  return totalWeight > 0 ? matches / totalWeight : 0;
};















