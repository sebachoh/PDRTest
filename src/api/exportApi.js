export const formatCoordinates = (points) => {
    return points.map(p => ({
        lat: Number(p.lat.toFixed(6)),
        lng: Number(p.lng.toFixed(6))
    }));
};

// Helper: Ray Casting Algorithm to check if a point is inside a polygon
export const isPointInPolygon = (point, polygon) => {
    const x = point.lat, y = point.lng;
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i].lat, yi = polygon[i].lng;
        const xj = polygon[j].lat, yj = polygon[j].lng;

        const intersect = ((yi > y) !== (yj > y)) &&
            (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
};

// Helper: Generate grid points inside area excluding restrictions
export const generateGridPoints = (areaPoints, restrictions, stepMeters = 5) => {
    if (areaPoints.length < 3) return [];

    // Calculate Bounding Box
    const lats = areaPoints.map(p => p.lat);
    const lngs = areaPoints.map(p => p.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const gridPoints = [];

    // Approximation: 1 deg lat ~ 111320m
    const stepLat = stepMeters / 111320;

    for (let lat = minLat; lat <= maxLat; lat += stepLat) {
        // Calculate lng step based on current latitude (Mercator projection factor)
        const stepLng = stepMeters / (111320 * Math.cos(lat * Math.PI / 180));

        for (let lng = minLng; lng <= maxLng; lng += stepLng) {
            const point = { lat, lng };

            // Check 1: Must be inside main area
            if (isPointInPolygon(point, areaPoints)) {
                // Check 2: Must NOT be inside any restriction
                const isInRestriction = restrictions.some(restriction =>
                    isPointInPolygon(point, restriction)
                );

                if (!isInRestriction) {
                    gridPoints.push(point);
                }
            }
        }
    }
    return gridPoints;
};

export const generateExportData = (areaPoints, restrictions) => {
    // Generate the internal grid points (default 5 meters step)
    const internalPoints = generateGridPoints(areaPoints, restrictions, 5);

    return {
        timestamp: new Date().toISOString(),
        summary: {
            total_area_points: areaPoints.length,
            total_restrictions: restrictions.length,
            generated_internal_points: internalPoints.length,
            grid_resolution_meters: 5
        },
        area: {
            vertices: formatCoordinates(areaPoints),
        },
        restrictions: restrictions.map((restriction, index) => ({
            id: index + 1,
            vertices: formatCoordinates(restriction)
        })),
        // The "all points" requested by the user
        internal_grid_points: formatCoordinates(internalPoints)
    };
};

export const downloadJSON = (data, filename = 'map_data.json') => {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

export const downloadText = (areaPoints, restrictions) => {
    let content = `COORDINATES REPORT - ${new Date().toLocaleString()}\n`;
    content += `${'='.repeat(50)}\n\n`;

    // Main Area
    content += `MAIN AREA (${areaPoints.length} points)\n`;
    content += `${'-'.repeat(20)}\n`;
    areaPoints.forEach((point, index) => {
        content += `Point ${index + 1}: ${point.lat.toFixed(6)}, ${point.lng.toFixed(6)}\n`;
    });
    // Extreme Points for Area
    if (areaPoints.length > 0) {
        const northernmost = areaPoints.reduce((max, p) => p.lat > max.lat ? p : max);
        const southernmost = areaPoints.reduce((min, p) => p.lat < min.lat ? p : min);
        const easternmost = areaPoints.reduce((max, p) => p.lng > max.lng ? p : max);
        const westernmost = areaPoints.reduce((min, p) => p.lng < min.lng ? p : min);

        content += `EXTREME POINTS (Main Area)\n`;
        content += `${'-'.repeat(20)}\n`;
        content += `North: ${northernmost.lat.toFixed(6)}, ${northernmost.lng.toFixed(6)}\n`;
        content += `South:   ${southernmost.lat.toFixed(6)}, ${southernmost.lng.toFixed(6)}\n`;
        content += `East:  ${easternmost.lat.toFixed(6)}, ${easternmost.lng.toFixed(6)}\n`;
        content += `West: ${westernmost.lat.toFixed(6)}, ${westernmost.lng.toFixed(6)}\n\n`;
    }

    // Restrictions
    if (restrictions.length > 0) {
        content += `RESTRICTIONS (${restrictions.length} zones)\n`;
        content += `${'='.repeat(50)}\n`;
        restrictions.forEach((restriction, index) => {
            content += `\nRestriction ${index + 1} (${restriction.length} points):\n`;
            content += `${'-'.repeat(20)}\n`;
            restriction.forEach((point, pIndex) => {
                content += `  R${index + 1}.P${pIndex + 1}: ${point.lat.toFixed(6)}, ${point.lng.toFixed(6)}\n`;
            });
        });
    } else {
        content += `There are no restrictions registered.\n`;
    }

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `coordinates_report_${Date.now()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};
