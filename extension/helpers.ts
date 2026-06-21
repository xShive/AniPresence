// =====================================================================
// LOCAL_URL and formatTime are needed in several places (popup, content
// scripts, kwik iframe). defining them here once and loading helpers.js
// first everywhere keeps them in one spot, and stops TypeScript from
// seeing two of the same global. that's what lets every file share one
// tsconfig instead of needing a separate config
// =====================================================================

// our local Python server
const LOCAL_URL = "http://127.0.0.1:5001";

// convert seconds into "m:ss" time string
function formatTime(seconds: number): string {
    return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}
