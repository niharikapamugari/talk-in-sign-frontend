import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

// 3-Joint Phalanges per finger [proximal_x, intermediate_x, distal_x]
// 0 = straight/extended, ~1.4 = fully curled
const HAND_SHAPES = {
  A: {
    thumb: [0.1, 0.2, 0.1],
    index: [1.4, 1.2, 0.9],
    middle: [1.4, 1.2, 0.9],
    ring: [1.4, 1.2, 0.9],
    pinky: [1.4, 1.2, 0.9]
  },
  B: {
    thumb: [0.9, 0.4, 0.2],
    index: [0.0, 0.0, 0.0],
    middle: [0.0, 0.0, 0.0],
    ring: [0.0, 0.0, 0.0],
    pinky: [0.0, 0.0, 0.0]
  },
  C: {
    thumb: [0.4, 0.4, 0.2],
    index: [0.6, 0.5, 0.4],
    middle: [0.6, 0.5, 0.4],
    ring: [0.6, 0.5, 0.4],
    pinky: [0.6, 0.5, 0.4]
  },
  D: {
    thumb: [0.8, 0.5, 0.2],
    index: [0.0, 0.0, 0.0],
    middle: [1.4, 1.2, 0.8],
    ring: [1.4, 1.2, 0.8],
    pinky: [1.4, 1.2, 0.8]
  },
  E: {
    thumb: [1.0, 0.5, 0.2],
    index: [1.3, 1.2, 0.8],
    middle: [1.3, 1.2, 0.8],
    ring: [1.3, 1.2, 0.8],
    pinky: [1.3, 1.2, 0.8]
  },
  F: {
    thumb: [0.5, 0.5, 0.2],
    index: [1.4, 1.1, 0.7],
    middle: [0.0, 0.0, 0.0],
    ring: [0.0, 0.0, 0.0],
    pinky: [0.0, 0.0, 0.0]
  },
  G: {
    thumb: [-0.3, 0.2, 0.1],
    index: [0.0, 0.0, 0.0],
    middle: [1.5, 1.3, 0.9],
    ring: [1.5, 1.3, 0.9],
    pinky: [1.5, 1.3, 0.9]
  },
  H: {
    thumb: [0.8, 0.4, 0.2],
    index: [0.0, 0.0, 0.0],
    middle: [0.0, 0.0, 0.0],
    ring: [1.5, 1.3, 0.9],
    pinky: [1.5, 1.3, 0.9]
  },
  I: {
    thumb: [0.9, 0.4, 0.2],
    index: [1.5, 1.3, 0.9],
    middle: [1.5, 1.3, 0.9],
    ring: [1.5, 1.3, 0.9],
    pinky: [0.0, 0.0, 0.0]
  },
  J: {
    thumb: [0.9, 0.4, 0.2],
    index: [1.5, 1.3, 0.9],
    middle: [1.5, 1.3, 0.9],
    ring: [1.5, 1.3, 0.9],
    pinky: [0.0, 0.0, 0.0]
  },
  K: {
    thumb: [0.2, 0.2, 0.1],
    index: [0.0, 0.0, 0.0],
    middle: [0.3, 0.3, 0.2],
    ring: [1.5, 1.3, 0.9],
    pinky: [1.5, 1.3, 0.9]
  },
  L: {
    thumb: [-0.7, 0.0, 0.0],
    index: [0.0, 0.0, 0.0],
    middle: [1.5, 1.3, 0.9],
    ring: [1.5, 1.3, 0.9],
    pinky: [1.5, 1.3, 0.9]
  },
  M: {
    thumb: [1.1, 0.5, 0.2],
    index: [1.4, 1.2, 0.8],
    middle: [1.4, 1.2, 0.8],
    ring: [1.4, 1.2, 0.8],
    pinky: [1.5, 1.3, 0.9]
  },
  N: {
    thumb: [1.0, 0.5, 0.2],
    index: [1.4, 1.2, 0.8],
    middle: [1.4, 1.2, 0.8],
    ring: [1.5, 1.3, 0.9],
    pinky: [1.5, 1.3, 0.9]
  },
  O: {
    thumb: [0.7, 0.5, 0.3],
    index: [0.9, 0.8, 0.6],
    middle: [0.9, 0.8, 0.6],
    ring: [0.9, 0.8, 0.6],
    pinky: [0.9, 0.8, 0.6]
  },
  P: {
    thumb: [0.2, 0.2, 0.1],
    index: [0.0, 0.0, 0.0],
    middle: [0.4, 0.4, 0.3],
    ring: [1.5, 1.3, 0.9],
    pinky: [1.5, 1.3, 0.9]
  },
  Q: {
    thumb: [-0.4, 0.2, 0.1],
    index: [0.2, 0.2, 0.1],
    middle: [1.5, 1.3, 0.9],
    ring: [1.5, 1.3, 0.9],
    pinky: [1.5, 1.3, 0.9]
  },
  R: {
    thumb: [0.9, 0.4, 0.2],
    index: [0.0, 0.0, 0.0],
    middle: [0.0, 0.0, 0.0],
    ring: [1.5, 1.3, 0.9],
    pinky: [1.5, 1.3, 0.9]
  },
  S: {
    thumb: [1.2, 0.5, 0.2],
    index: [1.5, 1.3, 0.9],
    middle: [1.5, 1.3, 0.9],
    ring: [1.5, 1.3, 0.9],
    pinky: [1.5, 1.3, 0.9]
  },
  T: {
    thumb: [0.5, 0.3, 0.2],
    index: [1.4, 1.2, 0.8],
    middle: [1.5, 1.3, 0.9],
    ring: [1.5, 1.3, 0.9],
    pinky: [1.5, 1.3, 0.9]
  },
  U: {
    thumb: [1.1, 0.4, 0.2],
    index: [0.0, 0.0, 0.0],
    middle: [0.0, 0.0, 0.0],
    ring: [1.5, 1.3, 0.9],
    pinky: [1.5, 1.3, 0.9]
  },
  V: {
    thumb: [1.1, 0.4, 0.2],
    index: [0.0, 0.0, 0.0],
    middle: [0.0, 0.0, 0.0],
    ring: [1.5, 1.3, 0.9],
    pinky: [1.5, 1.3, 0.9]
  },
  W: {
    thumb: [1.1, 0.4, 0.2],
    index: [0.0, 0.0, 0.0],
    middle: [0.0, 0.0, 0.0],
    ring: [0.0, 0.0, 0.0],
    pinky: [1.5, 1.3, 0.9]
  },
  X: {
    thumb: [0.9, 0.4, 0.2],
    index: [0.7, 0.8, 0.5],
    middle: [1.5, 1.3, 0.9],
    ring: [1.5, 1.3, 0.9],
    pinky: [1.5, 1.3, 0.9]
  },
  Y: {
    thumb: [-0.7, 0.0, 0.0],
    index: [1.5, 1.3, 0.9],
    middle: [1.5, 1.3, 0.9],
    ring: [1.5, 1.3, 0.9],
    pinky: [0.0, 0.0, 0.0]
  },
  Z: {
    thumb: [0.8, 0.4, 0.2],
    index: [0.0, 0.0, 0.0],
    middle: [1.5, 1.3, 0.9],
    ring: [1.5, 1.3, 0.9],
    pinky: [1.5, 1.3, 0.9]
  },
  OPEN_HAND: {
    thumb: [-0.4, 0.1, 0.1],
    index: [0.05, 0.06, 0.04],
    middle: [0.05, 0.06, 0.04],
    ring: [0.06, 0.06, 0.04],
    pinky: [0.07, 0.07, 0.05]
  },
  POINT: {
    thumb: [0.9, 0.4, 0.2],
    index: [0.0, 0.0, 0.0],
    middle: [1.5, 1.3, 0.9],
    ring: [1.5, 1.3, 0.9],
    pinky: [1.5, 1.3, 0.9]
  },
  FIST: {
    thumb: [1.1, 0.4, 0.2],
    index: [1.5, 1.3, 0.9],
    middle: [1.5, 1.3, 0.9],
    ring: [1.5, 1.3, 0.9],
    pinky: [1.5, 1.3, 0.9]
  },
  HOW_CUP: {
    thumb: [-0.2, 0.2, 0.1],
    index: [0.35, 0.35, 0.2],
    middle: [0.35, 0.35, 0.2],
    ring: [0.35, 0.35, 0.2],
    pinky: [0.35, 0.35, 0.2]
  },
  DEFAULT: {
    thumb: [0.3, 0.2, 0.1],
    index: [0.3, 0.3, 0.2],
    middle: [0.3, 0.3, 0.2],
    ring: [0.4, 0.4, 0.3],
    pinky: [0.4, 0.4, 0.3]
  }
};

function smoothStep(t) {
  return t * t * (3 - 2 * t);
}

export default function AvatarSigner({ word = 'SIGN', onComplete, speed = 1, isPaused = false }) {
  const mountRef = useRef(null);
  const cleanWord = (word || 'SIGN').toUpperCase().replace(/[^A-Z0-9_]/g, '');
  const letters = cleanWord.replace(/[^A-Z0-9]/g, '').split('');

  const isGesture = ['YOU', 'YOUR', 'PLEASE', 'HELLO', 'HI', 'THANK', 'THANK_YOU', 'YES', 'NO', 'SORRY', 'HOW'].includes(cleanWord);
  const [currentIdx, setCurrentIdx] = useState(0);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 460;
    const height = container.clientHeight || 370;

    // 1. Scene with Dark Cyber Studio Background
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x080c17);

    // 2. Camera Framing: Clean upper-body framing (whole head, shoulders, chest & hands fully visible)
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    camera.position.set(0, 0.5, 2.35); // Adjusted distance so full head and raised hands are never cut off
    camera.lookAt(0, 0.46, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 3. Studio Lighting for High-Contrast Cyber Visibility
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xfff7ed, 1.3);
    keyLight.position.set(2.0, 3.2, 2.5);
    keyLight.castShadow = true;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x7dd3fc, 0.7);
    fillLight.position.set(-2.0, 1.5, 1.8);
    scene.add(fillLight);

    // Cyber Cyan Rim Light (creates sleek glowing silhouette on character)
    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.2);
    rimLight.position.set(0, 2.4, -2.4);
    scene.add(rimLight);

    // 4. Boy Character Materials
    const skinMat = new THREE.MeshStandardMaterial({
      color: 0xf5caa2,
      roughness: 0.55,
      metalness: 0.02
    });

    // Boy's Royal Blue Athletic Crewneck T-Shirt
    const shirtMat = new THREE.MeshStandardMaterial({
      color: 0x1d4ed8, // Vibrant royal navy blue
      roughness: 0.7,
      metalness: 0.04
    });

    // Collar / Hem Trim
    const trimMat = new THREE.MeshStandardMaterial({
      color: 0x172554, // Deep navy trim
      roughness: 0.75
    });

    // Boy's Short Styled Hair
    const hairMat = new THREE.MeshStandardMaterial({
      color: 0x2b1810, // Dark chestnut brown boy haircut
      roughness: 0.88,
      metalness: 0.02
    });

    const scleraMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const irisMat = new THREE.MeshBasicMaterial({ color: 0x2563eb }); // Bright blue boy eyes
    const pupilMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });
    const highlightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const browMat = new THREE.MeshBasicMaterial({ color: 0x24120a });
    const lipMat = new THREE.MeshStandardMaterial({ color: 0xd96b6b, roughness: 0.6 });
    const teethMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const mouthInnerMat = new THREE.MeshBasicMaterial({ color: 0x771d2b });

    // 5. Boy Humanoid Rig Construction
    const avatarGroup = new THREE.Group();
    avatarGroup.position.set(0, -0.38, 0);
    scene.add(avatarGroup);

    // Athletic Boy Torso
    const chest = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.29, 0.5, 20), shirtMat);
    chest.position.y = 0.52;
    avatarGroup.add(chest);

    const waist = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.28, 0.35, 20), shirtMat);
    waist.position.y = 0.2;
    avatarGroup.add(waist);

    // Crewneck Collar Trim
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.17, 0.05, 20), trimMat);
    collar.position.y = 0.76;
    avatarGroup.add(collar);

    // Neck
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 0.16, 16), skinMat);
    neck.position.y = 0.82;
    avatarGroup.add(neck);

    // Head Group
    const headGroup = new THREE.Group();
    headGroup.position.y = 1.05;
    avatarGroup.add(headGroup);

    // Boy Head Mesh
    const headGeo = new THREE.SphereGeometry(0.21, 26, 26);
    headGeo.scale(0.96, 1.12, 1.02);
    const headMesh = new THREE.Mesh(headGeo, skinMat);
    headGroup.add(headMesh);

    // Ears
    const earGeo = new THREE.SphereGeometry(0.046, 12, 12);
    earGeo.scale(0.4, 1, 0.8);
    const leftEar = new THREE.Mesh(earGeo, skinMat);
    leftEar.position.set(-0.215, 0.01, 0.02);
    const rightEar = new THREE.Mesh(earGeo, skinMat);
    rightEar.position.set(0.215, 0.01, 0.02);
    headGroup.add(leftEar, rightEar);

    // Nose
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.024, 0.045, 10), skinMat);
    nose.rotation.x = Math.PI / 2;
    nose.position.set(0, 0.01, 0.22);
    headGroup.add(nose);

    // Eyes Builder
    function createEye(isRight = true) {
      const eyeGroup = new THREE.Group();
      eyeGroup.position.set(isRight ? 0.075 : -0.075, 0.045, 0.2);

      const sclera = new THREE.Mesh(new THREE.SphereGeometry(0.034, 16, 16), scleraMat);
      eyeGroup.add(sclera);

      const iris = new THREE.Mesh(new THREE.SphereGeometry(0.022, 14, 14), irisMat);
      iris.position.z = 0.016;
      eyeGroup.add(iris);

      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.012, 10, 10), pupilMat);
      pupil.position.z = 0.025;
      eyeGroup.add(pupil);

      const catchlight = new THREE.Mesh(new THREE.SphereGeometry(0.0045, 8, 8), highlightMat);
      catchlight.position.set(0.007, 0.007, 0.032);
      eyeGroup.add(catchlight);

      // Blinking eyelid
      const eyelidGroup = new THREE.Group();
      const lidMesh = new THREE.Mesh(new THREE.SphereGeometry(0.037, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), skinMat);
      lidMesh.rotation.x = Math.PI / 2;
      eyelidGroup.add(lidMesh);
      eyelidGroup.scale.set(1.02, 0.02, 1.02);
      eyeGroup.add(eyelidGroup);

      return { eyeGroup, eyelidGroup };
    }

    const rightEye = createEye(true);
    const leftEye = createEye(false);
    headGroup.add(rightEye.eyeGroup);
    headGroup.add(leftEye.eyeGroup);

    // Boy Eyebrows
    const browGeo = new THREE.BoxGeometry(0.06, 0.013, 0.02);
    const rightBrow = new THREE.Mesh(browGeo, browMat);
    rightBrow.position.set(0.075, 0.098, 0.205);
    rightBrow.rotation.z = -0.07;
    const leftBrow = new THREE.Mesh(browGeo, browMat);
    leftBrow.position.set(-0.075, 0.098, 0.205);
    leftBrow.rotation.z = 0.07;
    headGroup.add(rightBrow, leftBrow);

    // Mouth
    const mouthGroup = new THREE.Group();
    mouthGroup.position.set(0, -0.085, 0.21);
    headGroup.add(mouthGroup);

    const closedMouth = new THREE.Mesh(new THREE.TorusGeometry(0.034, 0.007, 8, 16, Math.PI * 0.8), lipMat);
    closedMouth.rotation.z = Math.PI * 1.1;
    mouthGroup.add(closedMouth);

    const openSmileGroup = new THREE.Group();
    const mouthCavity = new THREE.Mesh(new THREE.BoxGeometry(0.072, 0.03, 0.02), mouthInnerMat);
    openSmileGroup.add(mouthCavity);
    const teeth = new THREE.Mesh(new THREE.BoxGeometry(0.068, 0.014, 0.022), teethMat);
    teeth.position.y = 0.007;
    openSmileGroup.add(teeth);
    openSmileGroup.scale.set(0.01, 0.01, 0.01);
    mouthGroup.add(openSmileGroup);

    // Boy Hair: Short, cropped sides with styled top volume
    const hairGroup = new THREE.Group();
    headGroup.add(hairGroup);

    // Main Crown/Top Hair
    const mainHair = new THREE.Mesh(new THREE.SphereGeometry(0.225, 20, 20), hairMat);
    mainHair.scale.set(1.02, 1.08, 1.08);
    mainHair.position.set(0, 0.05, -0.02);
    hairGroup.add(mainHair);

    // Front Textured Bangs / Part
    const frontHair = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 12), hairMat);
    frontHair.scale.set(1.4, 0.6, 0.6);
    frontHair.position.set(0, 0.16, 0.15);
    frontHair.rotation.z = 0.08;
    hairGroup.add(frontHair);

    // Short Tapered Sideburns / Temples
    const leftSide = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.08, 0.08), hairMat);
    leftSide.position.set(-0.21, 0.04, 0.02);
    const rightSide = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.08, 0.08), hairMat);
    rightSide.position.set(0.21, 0.04, 0.02);
    hairGroup.add(leftSide, rightSide);

    // 6. Articulated Arms, Forearms & Hands
    // PRESERVING the full 3-joint phalanges notation that user praised!
    function createArm(isRight = true) {
      const armRoot = new THREE.Group();
      armRoot.position.set(isRight ? 0.35 : -0.35, 0.72, 0);

      // Shoulder Deltoid
      const shoulderCap = new THREE.Mesh(new THREE.SphereGeometry(0.078, 12, 12), shirtMat);
      armRoot.add(shoulderCap);

      // Upper Arm (Short Sleeve Shirt)
      const upperArm = new THREE.Group();
      armRoot.add(upperArm);
      const sleeveMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.065, 0.18, 14), shirtMat);
      sleeveMesh.position.y = -0.09;
      upperArm.add(sleeveMesh);
      const skinUpper = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.056, 0.12, 14), skinMat);
      skinUpper.position.y = -0.22;
      upperArm.add(skinUpper);

      // Elbow Joint
      const elbow = new THREE.Mesh(new THREE.SphereGeometry(0.056, 12, 12), skinMat);
      elbow.position.y = -0.28;
      upperArm.add(elbow);

      // Forearm
      const forearm = new THREE.Group();
      forearm.position.y = -0.28;
      upperArm.add(forearm);
      const forearmMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.056, 0.046, 0.25, 14), skinMat);
      forearmMesh.position.y = -0.125;
      forearm.add(forearmMesh);

      // Wrist Joint
      const wrist = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 12), skinMat);
      wrist.position.y = -0.25;
      forearm.add(wrist);

      // Hand Group
      const hand = new THREE.Group();
      hand.position.y = -0.25;
      forearm.add(hand);

      // Contoured Palm
      const palm = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.105, 0.034), skinMat);
      palm.position.y = -0.052;
      hand.add(palm);

      // Thenar pad (thumb muscle)
      const thenarPad = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 10), skinMat);
      thenarPad.scale.set(0.8, 1.2, 0.8);
      thenarPad.position.set(isRight ? 0.04 : -0.04, -0.038, 0.01);
      hand.add(thenarPad);

      // 4 Fingers + Opposable Thumb with 3 Segments each!
      const fingerList = [];
      const fingerNames = ['thumb', 'index', 'middle', 'ring', 'pinky'];
      const xOffsets = isRight
        ? [0.05, 0.032, 0.01, -0.013, -0.034]
        : [-0.05, -0.032, -0.01, 0.013, 0.034];

      fingerNames.forEach((name, fi) => {
        const fingerRoot = new THREE.Group();
        const isThumb = name === 'thumb';

        if (isThumb) {
          fingerRoot.position.set(xOffsets[fi], -0.042, 0.01);
          fingerRoot.rotation.z = isRight ? -0.45 : 0.45;
        } else {
          fingerRoot.position.set(xOffsets[fi], -0.105, 0);
        }
        hand.add(fingerRoot);

        // Segment 1 (Proximal)
        const len1 = isThumb ? 0.038 : name === 'middle' ? 0.045 : name === 'pinky' ? 0.032 : 0.041;
        const seg1 = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.012, len1, 8), skinMat);
        seg1.position.y = -len1 / 2;
        fingerRoot.add(seg1);

        const k1 = new THREE.Mesh(new THREE.SphereGeometry(0.0125, 8, 8), skinMat);
        k1.position.y = -len1;
        fingerRoot.add(k1);

        // Segment 2 (Intermediate)
        const midJoint = new THREE.Group();
        midJoint.position.y = -len1;
        fingerRoot.add(midJoint);

        const len2 = len1 * 0.78;
        const seg2 = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.0108, len2, 8), skinMat);
        seg2.position.y = -len2 / 2;
        midJoint.add(seg2);

        const k2 = new THREE.Mesh(new THREE.SphereGeometry(0.011, 8, 8), skinMat);
        k2.position.y = -len2;
        midJoint.add(k2);

        // Segment 3 (Distal / Fingertip)
        const tipJoint = new THREE.Group();
        tipJoint.position.y = -len2;
        midJoint.add(tipJoint);

        const len3 = len2 * 0.72;
        const seg3 = new THREE.Mesh(new THREE.CylinderGeometry(0.0108, 0.0095, len3, 8), skinMat);
        seg3.position.y = -len3 / 2;
        tipJoint.add(seg3);

        const fingertip = new THREE.Mesh(new THREE.SphereGeometry(0.0098, 8, 8), skinMat);
        fingertip.position.y = -len3;
        tipJoint.add(fingertip);

        fingerList.push({ name, root: fingerRoot, mid: midJoint, tip: tipJoint });
      });

      return { armRoot, upperArm, forearm, hand, fingers: fingerList };
    }

    const rightArm = createArm(true);
    const leftArm = createArm(false);
    avatarGroup.add(rightArm.armRoot);
    avatarGroup.add(leftArm.armRoot);

    function applyFingerPose(arm, shapeKey, lerpRate = 0.24) {
      const shape = HAND_SHAPES[shapeKey] || HAND_SHAPES.DEFAULT;
      arm.fingers.forEach(f => {
        const angles = shape[f.name] || [0.2, 0.2, 0.1];
        f.root.rotation.x = THREE.MathUtils.lerp(f.root.rotation.x, angles[0], lerpRate);
        f.mid.rotation.x = THREE.MathUtils.lerp(f.mid.rotation.x, angles[1], lerpRate);
        f.tip.rotation.x = THREE.MathUtils.lerp(f.tip.rotation.x, angles[2], lerpRate);
      });
    }

    // 7. Animation Progression
    let animId;
    let startTime = performance.now();
    let letterIndex = 0;
    const letterDuration = Math.max(500, 900 / speed);
    const gestureTotalDuration = Math.max(2000, 2800 / speed);
    let completed = false;

    function animate(now) {
      animId = requestAnimationFrame(animate);
      if (isPaused) return;

      const elapsed = now - startTime;
      const t = now * 0.002 * speed;

      // Natural Breathing & Subtle Saccadic Motion
      chest.position.y = 0.52 + Math.sin(t * 1.6) * 0.003;
      headGroup.position.y = 1.05 + Math.sin(t * 1.6) * 0.002;

      // Organic Blinking every 3.6s
      const blinkCycle = (now % 3600) / 3600;
      let blinkProgress = 0;
      if (blinkCycle < 0.04) {
        blinkProgress = Math.sin((blinkCycle / 0.04) * Math.PI);
      }
      const lidScale = THREE.MathUtils.lerp(0.02, 1.0, blinkProgress);
      rightEye.eyelidGroup.scale.y = lidScale;
      leftEye.eyelidGroup.scale.y = lidScale;

      if (isGesture) {
        // --- Dedicated High-Visibility ISL Gestures ---
        const rawP = Math.min(elapsed / gestureTotalDuration, 1.0);
        const p = smoothStep(rawP);

        if (cleanWord === 'THANK' || cleanWord === 'THANK_YOU') {
          applyFingerPose(rightArm, 'OPEN_HAND', 0.25);
          applyFingerPose(leftArm, 'DEFAULT', 0.15);

          leftArm.upperArm.rotation.set(-0.35, -0.15, 0.25);
          leftArm.forearm.rotation.set(-0.7, -0.2, -0.2);

          if (p < 0.45) {
            // Stage 1: Hand touching chin/lower lip
            const localP = smoothStep(p / 0.45);
            rightArm.upperArm.rotation.x = THREE.MathUtils.lerp(-0.3, -1.02, localP);
            rightArm.upperArm.rotation.y = THREE.MathUtils.lerp(0.1, 0.35, localP);
            rightArm.upperArm.rotation.z = THREE.MathUtils.lerp(-0.2, -0.42, localP);

            rightArm.forearm.rotation.x = THREE.MathUtils.lerp(-0.6, -1.6, localP);
            rightArm.forearm.rotation.y = THREE.MathUtils.lerp(0.2, 0.5, localP);
            rightArm.hand.rotation.x = THREE.MathUtils.lerp(0.1, 0.35, localP);

            headGroup.rotation.x = THREE.MathUtils.lerp(0, 0.05, localP);

            closedMouth.visible = true;
            openSmileGroup.scale.set(0.01, 0.01, 0.01);
          } else {
            // Stage 2: Hand sweeps forward & down toward viewer; radiant open smile!
            const localP = smoothStep((p - 0.45) / 0.55);
            rightArm.upperArm.rotation.x = THREE.MathUtils.lerp(-1.02, -0.68, localP);
            rightArm.upperArm.rotation.y = THREE.MathUtils.lerp(0.35, 0.15, localP);
            rightArm.upperArm.rotation.z = THREE.MathUtils.lerp(-0.42, -0.15, localP);

            rightArm.forearm.rotation.x = THREE.MathUtils.lerp(-1.6, -0.78, localP);
            rightArm.forearm.rotation.y = THREE.MathUtils.lerp(0.5, 0.18, localP);
            rightArm.hand.rotation.x = THREE.MathUtils.lerp(0.35, -0.12, localP);

            headGroup.rotation.x = THREE.MathUtils.lerp(0.05, 0.08, localP);

            closedMouth.visible = false;
            const smileScale = THREE.MathUtils.lerp(0.01, 1.0, localP);
            openSmileGroup.scale.set(smileScale, smileScale, 1.0);
          }
        } else if (cleanWord === 'HOW') {
          // Both hands raised in front of chest, cupping/twisting outward in ISL question pose
          applyFingerPose(rightArm, 'HOW_CUP', 0.25);
          applyFingerPose(leftArm, 'HOW_CUP', 0.25);

          const twist = Math.sin(t * 4.5) * 0.22;

          rightArm.upperArm.rotation.x = THREE.MathUtils.lerp(rightArm.upperArm.rotation.x, -0.72, 0.15);
          rightArm.upperArm.rotation.y = THREE.MathUtils.lerp(rightArm.upperArm.rotation.y, 0.2, 0.15);
          rightArm.upperArm.rotation.z = THREE.MathUtils.lerp(rightArm.upperArm.rotation.z, -0.28, 0.15);
          rightArm.forearm.rotation.x = THREE.MathUtils.lerp(rightArm.forearm.rotation.x, -1.3, 0.15);
          rightArm.hand.rotation.z = THREE.MathUtils.lerp(rightArm.hand.rotation.z, 0.28 + twist, 0.2);

          leftArm.upperArm.rotation.x = THREE.MathUtils.lerp(leftArm.upperArm.rotation.x, -0.72, 0.15);
          leftArm.upperArm.rotation.y = THREE.MathUtils.lerp(leftArm.upperArm.rotation.y, -0.2, 0.15);
          leftArm.upperArm.rotation.z = THREE.MathUtils.lerp(leftArm.upperArm.rotation.z, 0.28, 0.15);
          leftArm.forearm.rotation.x = THREE.MathUtils.lerp(leftArm.forearm.rotation.x, -1.3, 0.15);
          leftArm.hand.rotation.z = THREE.MathUtils.lerp(leftArm.hand.rotation.z, -0.28 - twist, 0.2);

          headGroup.rotation.z = Math.sin(t * 3.5) * 0.05;
          headGroup.rotation.x = 0.04;
          closedMouth.visible = false;
          openSmileGroup.scale.set(0.7, 0.7, 1.0);
        } else if (cleanWord === 'PLEASE') {
          applyFingerPose(rightArm, 'OPEN_HAND', 0.25);
          applyFingerPose(leftArm, 'DEFAULT', 0.15);

          const circleX = Math.cos(t * 4.5) * 0.08;
          const circleY = Math.sin(t * 4.5) * 0.06;

          rightArm.upperArm.rotation.x = THREE.MathUtils.lerp(rightArm.upperArm.rotation.x, -0.7 + circleX, 0.15);
          rightArm.upperArm.rotation.y = THREE.MathUtils.lerp(rightArm.upperArm.rotation.y, 0.32, 0.15);
          rightArm.upperArm.rotation.z = THREE.MathUtils.lerp(rightArm.upperArm.rotation.z, -0.4, 0.15);

          rightArm.forearm.rotation.x = THREE.MathUtils.lerp(rightArm.forearm.rotation.x, -1.35 + circleY, 0.15);
          rightArm.forearm.rotation.y = THREE.MathUtils.lerp(rightArm.forearm.rotation.y, -0.25, 0.15);
          rightArm.hand.rotation.z = THREE.MathUtils.lerp(rightArm.hand.rotation.z, 0.38, 0.15);

          headGroup.rotation.z = Math.sin(t * 2) * 0.04;
          headGroup.rotation.x = 0.03;
          closedMouth.visible = false;
          openSmileGroup.scale.set(0.85, 0.85, 1.0);
        } else if (cleanWord === 'YOU' || cleanWord === 'YOUR') {
          applyFingerPose(rightArm, 'POINT', 0.25);
          applyFingerPose(leftArm, 'DEFAULT', 0.15);

          rightArm.upperArm.rotation.x = THREE.MathUtils.lerp(rightArm.upperArm.rotation.x, -0.9, 0.14);
          rightArm.upperArm.rotation.y = THREE.MathUtils.lerp(rightArm.upperArm.rotation.y, 0.04, 0.14);
          rightArm.upperArm.rotation.z = THREE.MathUtils.lerp(rightArm.upperArm.rotation.z, -0.05, 0.14);

          rightArm.forearm.rotation.x = THREE.MathUtils.lerp(rightArm.forearm.rotation.x, -0.35, 0.14);
          rightArm.forearm.rotation.y = THREE.MathUtils.lerp(rightArm.forearm.rotation.y, 0.12, 0.14);

          headGroup.rotation.x = 0.03;
          closedMouth.visible = true;
          openSmileGroup.scale.set(0.01, 0.01, 0.01);
        } else if (cleanWord === 'HELLO' || cleanWord === 'HI') {
          applyFingerPose(rightArm, 'OPEN_HAND', 0.25);
          const wave = Math.sin(t * 6.5) * 0.18;

          rightArm.upperArm.rotation.x = THREE.MathUtils.lerp(rightArm.upperArm.rotation.x, -1.22, 0.14);
          rightArm.upperArm.rotation.y = THREE.MathUtils.lerp(rightArm.upperArm.rotation.y, 0.35, 0.14);
          rightArm.upperArm.rotation.z = THREE.MathUtils.lerp(rightArm.upperArm.rotation.z, -0.65, 0.14);

          rightArm.forearm.rotation.x = THREE.MathUtils.lerp(rightArm.forearm.rotation.x, -1.25, 0.14);
          rightArm.hand.rotation.z = THREE.MathUtils.lerp(rightArm.hand.rotation.z, wave, 0.25);

          headGroup.rotation.z = -0.04;
          closedMouth.visible = false;
          openSmileGroup.scale.set(0.9, 0.9, 1.0);
        } else if (cleanWord === 'YES') {
          applyFingerPose(rightArm, 'FIST', 0.25);
          const nod = Math.sin(t * 5.5) * 0.35;
          rightArm.upperArm.rotation.x = THREE.MathUtils.lerp(rightArm.upperArm.rotation.x, -0.72, 0.15);
          rightArm.forearm.rotation.x = THREE.MathUtils.lerp(rightArm.forearm.rotation.x, -1.25 + nod, 0.25);
          headGroup.rotation.x = nod * 0.3;
          closedMouth.visible = true;
          openSmileGroup.scale.set(0.01, 0.01, 0.01);
        } else if (cleanWord === 'NO') {
          const snap = Math.sin(t * 6.0) > 0 ? 'FIST' : 'OPEN_HAND';
          applyFingerPose(rightArm, snap, 0.3);
          rightArm.upperArm.rotation.x = THREE.MathUtils.lerp(rightArm.upperArm.rotation.x, -0.68, 0.15);
          rightArm.forearm.rotation.x = THREE.MathUtils.lerp(rightArm.forearm.rotation.x, -1.05, 0.15);
          headGroup.rotation.y = Math.sin(t * 6.0) * 0.08;
        }

        if (rawP >= 1.0 && !completed) {
          completed = true;
          if (onComplete) onComplete();
          return;
        }
      } else {
        // --- Continuous Fingerspelling Alphabet ---
        // Raised into signing space at chest/shoulder level facing camera
        rightArm.upperArm.rotation.x = THREE.MathUtils.lerp(rightArm.upperArm.rotation.x, -0.5, 0.18);
        rightArm.upperArm.rotation.y = THREE.MathUtils.lerp(rightArm.upperArm.rotation.y, 0.18, 0.18);
        rightArm.upperArm.rotation.z = THREE.MathUtils.lerp(rightArm.upperArm.rotation.z, -0.35, 0.18);

        rightArm.forearm.rotation.x = THREE.MathUtils.lerp(rightArm.forearm.rotation.x, -1.48, 0.18);
        rightArm.forearm.rotation.y = THREE.MathUtils.lerp(rightArm.forearm.rotation.y, 0.42, 0.18);

        rightArm.hand.rotation.x = THREE.MathUtils.lerp(rightArm.hand.rotation.x, 0.26, 0.18);
        rightArm.hand.rotation.y = THREE.MathUtils.lerp(rightArm.hand.rotation.y, -0.14, 0.18);
        rightArm.hand.rotation.z = THREE.MathUtils.lerp(rightArm.hand.rotation.z, 0.12, 0.18);

        leftArm.upperArm.rotation.x = THREE.MathUtils.lerp(leftArm.upperArm.rotation.x, -0.35, 0.1);
        leftArm.forearm.rotation.x = THREE.MathUtils.lerp(leftArm.forearm.rotation.x, -0.7, 0.1);

        const currentLetter = letters[letterIndex] || 'A';
        applyFingerPose(rightArm, currentLetter, 0.26);
        applyFingerPose(leftArm, 'DEFAULT', 0.15);

        closedMouth.visible = true;
        openSmileGroup.scale.set(0.01, 0.01, 0.01);

        if (elapsed > letterDuration * (letterIndex + 1)) {
          letterIndex++;
          if (letterIndex >= letters.length) {
            if (!completed) {
              completed = true;
              if (onComplete) onComplete();
            }
            return;
          }
          setCurrentIdx(letterIndex);
        }
      }

      renderer.render(scene, camera);
    }

    animId = requestAnimationFrame(animate);

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || 460;
      const h = container.clientHeight || 370;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animId);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [word, speed, isPaused]);

  return (
    <div className="avatar-signer-container light-theme">
      <div className="avatar-hud light-hud">
        <div className="avatar-hud-top">
          <span className="avatar-tag">
            {isGesture ? '👤 3D ISL AVATAR \u00B7 NATURAL SIGN' : '👤 3D ISL AVATAR \u00B7 FINGERSPELLING'}
          </span>
          <span className="avatar-speed-badge">{speed}x Speed</span>
        </div>

        {!isGesture && letters.length > 0 && (
          <div className="avatar-letters">
            {letters.map((char, i) => (
              <span
                key={i}
                className={`avatar-letter-chip ${i === currentIdx ? 'active' : i < currentIdx ? 'done' : ''}`}
              >
                {char}
              </span>
            ))}
          </div>
        )}

        {isGesture && (
          <div className="avatar-gesture-pill light-pill">
            <span>Performing ISL Sign: <strong>{cleanWord}</strong></span>
          </div>
        )}
      </div>

      <div ref={mountRef} className="avatar-canvas-wrap" />

      <div className="avatar-progress-bar light-progress">
        <div
          className="avatar-progress-fill"
          style={{
            width: isGesture
              ? '100%'
              : `${((currentIdx + 1) / Math.max(letters.length, 1)) * 100}%`
          }}
        />
      </div>
    </div>
  );
}
