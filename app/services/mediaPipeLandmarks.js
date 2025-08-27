/**
 * MediaPipe Face Mesh Landmark Processor
 * Maps 468 facial landmarks to specific makeup application zones
 * Based on MediaPipe Face Mesh topology: https://github.com/google/mediapipe
 */

export class MediaPipeLandmarkProcessor {
  constructor() {
    // MediaPipe Face Mesh 468 landmark indices organized by facial regions
    this.landmarkMap = {
      // FACE OVAL & CONTOUR (17 main points + additional mesh points)
      face_oval: [
        10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288,
        397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136,
        172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109
      ],
      
      // EYEBROWS (left and right)
      left_eyebrow: [46, 53, 52, 51, 48, 115, 131, 134, 102, 49, 220, 305],
      right_eyebrow: [276, 283, 282, 281, 278, 344, 360, 363, 331, 279, 440, 75],
      
      // EYES (detailed iris, eyelids, corners)
      left_eye: {
        upper_lid: [246, 161, 160, 159, 158, 157, 173, 133, 155, 154, 153, 145, 144, 163, 7],
        lower_lid: [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246],
        iris: [468, 469, 470, 471, 472], // Iris landmarks (if refineLandmarks enabled)
        corners: [33, 133], // Inner and outer corners
        pupil: [468] // Pupil center
      },
      
      right_eye: {
        upper_lid: [466, 388, 387, 386, 385, 384, 398, 362, 382, 381, 380, 374, 373, 390, 249],
        lower_lid: [263, 249, 390, 373, 374, 380, 381, 382, 362, 398, 384, 385, 386, 387, 388, 466],
        iris: [473, 474, 475, 476, 477], // Iris landmarks (if refineLandmarks enabled)
        corners: [263, 362], // Inner and outer corners
        pupil: [473] // Pupil center
      },
      
      // NOSE (bridge, tip, nostrils, wings)
      nose: {
        bridge: [6, 168, 8, 9, 10, 151, 195, 197, 196, 3, 51, 48, 115, 131, 134, 102, 49, 220, 305],
        tip: [1, 2, 5, 4, 6, 19, 20, 94, 125, 141, 235, 236, 3, 51, 48, 115],
        nostrils: [79, 82, 13, 312, 308, 324, 318],
        wings: [84, 17, 314, 405, 320, 307, 375, 321, 308, 324, 318]
      },
      
      // LIPS (outer, inner, corners, cupid's bow)
      lips: {
        outer_upper: [61, 84, 17, 314, 405, 320, 307, 375, 321, 308, 324, 318],
        outer_lower: [178, 87, 14, 317, 402, 318, 324, 308, 324, 318],
        inner_upper: [78, 81, 13, 311, 308, 415, 310, 311, 312, 13, 82, 81, 78],
        inner_lower: [88, 95, 15, 16, 315, 316, 403, 404, 320, 307, 375, 321],
        corners: [61, 291], // Left and right mouth corners
        cupids_bow: [0, 17, 18, 200] // Upper lip peak points
      },
      
      // CHEEKS & FACE STRUCTURE
      cheeks: {
        left_cheek: [116, 117, 118, 119, 120, 121, 126, 142, 36, 205, 206, 207, 213, 192, 147],
        right_cheek: [345, 346, 347, 348, 349, 350, 355, 371, 266, 425, 426, 427, 436, 416, 376],
        cheekbones: [116, 117, 118, 119, 120, 121, 345, 346, 347, 348, 349, 350]
      },
      
      // FOREHEAD
      forehead: [9, 10, 151, 337, 299, 333, 298, 301, 368, 264, 447, 366, 401, 435, 410, 454],
      
      // JAW & CHIN
      jawline: [172, 136, 150, 149, 176, 148, 152, 377, 400, 378, 379, 365, 397, 288, 361, 323],
      chin: [18, 175, 199, 200, 16, 17, 18, 200, 199, 175]
    };
    
    // Makeup application zones with their corresponding landmark groups
    this.makeupZones = {
      foundation: 'face_oval',
      concealer: ['left_eye', 'right_eye', 'nose', 'chin'],
      eyeshadow: ['left_eye', 'right_eye'],
      eyeliner: ['left_eye.upper_lid', 'right_eye.upper_lid'],
      mascara: ['left_eye', 'right_eye'],
      eyebrows: ['left_eyebrow', 'right_eyebrow'],
      blush: ['cheeks.left_cheek', 'cheeks.right_cheek'],
      contour: ['cheeks.cheekbones', 'jawline', 'forehead'],
      highlight: ['nose.bridge', 'cheeks.cheekbones', 'forehead'],
      lipstick: ['lips.outer_upper', 'lips.outer_lower'],
      lip_liner: ['lips.outer_upper', 'lips.outer_lower']
    };
  }

  /**
   * Process MediaPipe landmarks into makeup-ready format
   */
  processLandmarks(faceLandmarks) {
    if (!faceLandmarks || faceLandmarks.length < 468) {
      console.warn('Insufficient landmarks for makeup application');
      return null;
    }

    const processedData = {
      // Raw 468 landmarks for ControlNet
      raw_landmarks: faceLandmarks,
      
      // Organized by facial features
      facial_features: this.extractFacialFeatures(faceLandmarks),
      
      // Makeup application zones
      makeup_zones: this.extractMakeupZones(faceLandmarks),
      
      // Face geometry and measurements
      face_geometry: this.calculateFaceGeometry(faceLandmarks),
      
      // Quality metrics
      quality_metrics: this.assessLandmarkQuality(faceLandmarks)
    };

    return processedData;
  }

  /**
   * Extract facial features organized by type
   */
  extractFacialFeatures(landmarks) {
    const features = {};
    
    // Process each facial region
    Object.keys(this.landmarkMap).forEach(region => {
      if (typeof this.landmarkMap[region] === 'object' && !Array.isArray(this.landmarkMap[region])) {
        // Nested structure (like eyes, nose, lips)
        features[region] = {};
        Object.keys(this.landmarkMap[region]).forEach(subRegion => {
          features[region][subRegion] = this.landmarkMap[region][subRegion].map(index => landmarks[index]);
        });
      } else {
        // Simple array structure
        features[region] = this.landmarkMap[region].map(index => landmarks[index]);
      }
    });

    return features;
  }

  /**
   * Extract makeup application zones
   */
  extractMakeupZones(landmarks) {
    const zones = {};
    
    Object.keys(this.makeupZones).forEach(makeupType => {
      zones[makeupType] = {
        landmarks: this.getMakeupZoneLandmarks(landmarks, this.makeupZones[makeupType]),
        bounds: null, // Will be calculated
        mask_data: null // For ControlNet mask generation
      };
      
      // Calculate bounding box for each zone
      zones[makeupType].bounds = this.calculateBounds(zones[makeupType].landmarks);
      
      // Generate mask data for ControlNet
      zones[makeupType].mask_data = this.generateMaskData(zones[makeupType].landmarks);
    });

    return zones;
  }

  /**
   * Get landmarks for specific makeup zone
   */
  getMakeupZoneLandmarks(landmarks, zoneDefinition) {
    if (Array.isArray(zoneDefinition)) {
      return zoneDefinition.map(index => landmarks[index]);
    }
    
    if (typeof zoneDefinition === 'string') {
      return this.landmarkMap[zoneDefinition].map(index => landmarks[index]);
    }
    
    // Handle nested references like 'left_eye.upper_lid'
    const parts = zoneDefinition.split('.');
    let current = this.landmarkMap[parts[0]];
    for (let i = 1; i < parts.length; i++) {
      current = current[parts[i]];
    }
    
    return current.map(index => landmarks[index]);
  }

  /**
   * Calculate face geometry and measurements
   */
  calculateFaceGeometry(landmarks) {
    const geometry = {
      // Face dimensions
      face_width: this.calculateDistance(landmarks[234], landmarks[454]), // Left to right face
      face_height: this.calculateDistance(landmarks[10], landmarks[152]), // Top to bottom face
      
      // Eye measurements
      left_eye_width: this.calculateDistance(landmarks[33], landmarks[133]),
      right_eye_width: this.calculateDistance(landmarks[362], landmarks[263]),
      eye_distance: this.calculateDistance(landmarks[133], landmarks[362]),
      
      // Nose measurements
      nose_width: this.calculateDistance(landmarks[79], landmarks[308]),
      nose_length: this.calculateDistance(landmarks[6], landmarks[2]),
      
      // Lip measurements
      lip_width: this.calculateDistance(landmarks[61], landmarks[291]),
      lip_height: this.calculateDistance(landmarks[13], landmarks[14]),
      
      // Face ratios (for makeup style recommendations)
      face_ratio: 0, // Will be calculated
      eye_ratio: 0,
      lip_ratio: 0
    };

    // Calculate ratios
    geometry.face_ratio = geometry.face_width / geometry.face_height;
    geometry.eye_ratio = geometry.eye_distance / geometry.face_width;
    geometry.lip_ratio = geometry.lip_width / geometry.face_width;

    return geometry;
  }

  /**
   * Calculate distance between two points
   */
  calculateDistance(point1, point2) {
    if (!point1 || !point2) return 0;
    
    const dx = point1.x - point2.x;
    const dy = point1.y - point2.y;
    const dz = (point1.z || 0) - (point2.z || 0);
    
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * Calculate bounding box for a set of landmarks
   */
  calculateBounds(landmarks) {
    if (!landmarks || landmarks.length === 0) return null;

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    landmarks.forEach(point => {
      if (point && typeof point.x === 'number' && typeof point.y === 'number') {
        minX = Math.min(minX, point.x);
        maxX = Math.max(maxX, point.x);
        minY = Math.min(minY, point.y);
        maxY = Math.max(maxY, point.y);
      }
    });

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
      center: {
        x: (minX + maxX) / 2,
        y: (minY + maxY) / 2
      }
    };
  }

  /**
   * Generate mask data for ControlNet
   */
  generateMaskData(landmarks) {
    if (!landmarks || landmarks.length === 0) return null;

    return {
      points: landmarks.map(point => ({
        x: point.x,
        y: point.y,
        z: point.z || 0
      })),
      polygon: this.createPolygonFromPoints(landmarks),
      convex_hull: this.calculateConvexHull(landmarks)
    };
  }

  /**
   * Create polygon from landmark points
   */
  createPolygonFromPoints(landmarks) {
    // Simple polygon creation - in production, use more sophisticated algorithms
    return landmarks.map(point => [point.x, point.y]);
  }

  /**
   * Calculate convex hull for landmark points
   */
  calculateConvexHull(landmarks) {
    // Simplified convex hull - in production, implement Graham scan or similar
    const bounds = this.calculateBounds(landmarks);
    if (!bounds) return [];
    
    return [
      [bounds.x, bounds.y],
      [bounds.x + bounds.width, bounds.y],
      [bounds.x + bounds.width, bounds.y + bounds.height],
      [bounds.x, bounds.y + bounds.height]
    ];
  }

  /**
   * Assess landmark quality for makeup application
   */
  assessLandmarkQuality(landmarks) {
    const quality = {
      total_landmarks: landmarks.length,
      valid_landmarks: landmarks.filter(p => p && typeof p.x === 'number').length,
      coverage_score: 0,
      symmetry_score: 0,
      stability_score: 0,
      is_suitable_for_makeup: false
    };

    // Calculate coverage score
    quality.coverage_score = quality.valid_landmarks / 468;

    // Calculate symmetry score (compare left and right face features)
    quality.symmetry_score = this.calculateSymmetryScore(landmarks);

    // Overall suitability
    quality.is_suitable_for_makeup = 
      quality.coverage_score > 0.95 && 
      quality.symmetry_score > 0.8 &&
      quality.valid_landmarks >= 460;

    return quality;
  }

  /**
   * Calculate facial symmetry score
   */
  calculateSymmetryScore(landmarks) {
    // Compare left and right eye positions
    const leftEye = landmarks[33]; // Left eye corner
    const rightEye = landmarks[263]; // Right eye corner
    const noseTip = landmarks[1]; // Nose tip
    
    if (!leftEye || !rightEye || !noseTip) return 0;

    // Calculate distances from nose to each eye
    const leftDistance = this.calculateDistance(noseTip, leftEye);
    const rightDistance = this.calculateDistance(noseTip, rightEye);
    
    // Symmetry score based on distance ratio
    const ratio = Math.min(leftDistance, rightDistance) / Math.max(leftDistance, rightDistance);
    
    return ratio;
  }

  /**
   * Export landmarks for ControlNet processing
   */
  exportForControlNet(processedLandmarks) {
    return {
      // Face mesh for precise control
      face_mesh: processedLandmarks.raw_landmarks,
      
      // Makeup zones with masks
      makeup_masks: Object.keys(processedLandmarks.makeup_zones).reduce((masks, zone) => {
        masks[zone] = processedLandmarks.makeup_zones[zone].mask_data;
        return masks;
      }, {}),
      
      // Face geometry for style adaptation
      geometry: processedLandmarks.face_geometry,
      
      // Quality metrics for processing decisions
      quality: processedLandmarks.quality_metrics
    };
  }
}

export default new MediaPipeLandmarkProcessor(); 