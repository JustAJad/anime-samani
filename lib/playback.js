// SPDX-License-Identifier: MPL-2.0
const snapshotScript = `(()=>{const v=[...document.querySelectorAll('video')].filter(v=>Number.isFinite(v.duration)&&v.duration>0).sort((a,b)=>(b.videoWidth*b.videoHeight)-(a.videoWidth*a.videoHeight))[0];return v?{time:v.currentTime,duration:v.duration,paused:v.paused,rate:v.playbackRate,source:v.currentSrc}:null})()`;
function validPosition(value) {
  return (
    value &&
    Number.isFinite(value.time) &&
    Number.isFinite(value.duration) &&
    value.duration > 0 &&
    value.time >= 0 &&
    value.time <= value.duration &&
    value.duration < 86400
  );
}
function progressKey(page) {
  return `${page.url.split('#')[0]}|${page.episode || ''}`;
}
async function sampleFrames(contents) {
  const frames = contents.mainFrame.framesInSubtree;
  const values = await Promise.all(
    frames.map(async frame => {
      try {
        return { frame, value: await frame.executeJavaScript(snapshotScript) };
      } catch {
        return null;
      }
    })
  );
  return (
    values
      .filter(x => validPosition(x?.value))
      .sort(
        (a, b) =>
          Number(a.value.paused) - Number(b.value.paused) || b.value.duration - a.value.duration
      )[0] || null
  );
}
async function seekFrame(frame, time) {
  if (!Number.isFinite(time) || time < 0) return false;
  return frame.executeJavaScript(
    `(()=>{const v=[...document.querySelectorAll('video')].filter(v=>Number.isFinite(v.duration)&&v.duration>0).sort((a,b)=>(b.videoWidth*b.videoHeight)-(a.videoWidth*a.videoHeight))[0];if(!v)return false;v.currentTime=Math.min(${JSON.stringify(time)},Math.max(0,v.duration-2));return true})()`
  );
}
module.exports = { validPosition, progressKey, sampleFrames, seekFrame };
