////////////////////////////////////////////////////////////////////////////////

/* COMP 3490 A1 Skeleton for Claw Machine (Barebones Edition)
 * Note that you may make use of the skeleton provided, or start from scratch.
 * The choice is up to you.
 * Read the assignment directions carefully
 * Your claw mechanism should be created such that it is represented hierarchically
 * You might consider looking at THREE.Group and THREE.Object3D for reference
 * If you want to play around with the canvas position, or other HTML/JS level constructs
 * you are welcome to do so.


 /*global variables, coordinates, clock etc.  */

'use strict';

Physijs.scripts.worker = 'js/physijs_worker.js';
Physijs.scripts.ammo = 'ammo.js';

var WIDTH = window.innerWidth;
var HEIGHT = window.innerHeight;
var RATIO = WIDTH / HEIGHT;

var camera, scene, renderer;
var cameraControls;

var joystick, claw, bar, bar_unit, wire;
var viewpoint = 1;
var mixer1, mixer2;
var clawX, clawZ;

var clock = new THREE.Clock();
var keyboard = new KeyboardState();

// Initialization. Define the size of the canvas and store the aspect ratio
// You can change these as well

function init() {

  // Set up a renderer. This will allow WebGL to make your scene appear
  renderer = new THREE.WebGLRenderer({
    antialias: true
  });

  renderer.gammaInput = true;
  renderer.gammaOutput = true;
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(WIDTH, HEIGHT);
  renderer.setClearColor(0xAAAAAA, 1.0);

  scene = new Physijs.Scene();
  scene.setGravity(new THREE.Vector3(0, -100, 0));

  // You also want a camera. The camera has a default position, but you most likely want to change this.
  // You'll also want to allow a viewpoint that is reminiscent of using the machine as described in the pdf
  // This might include a different position and/or a different field of view etc.
  camera = new THREE.PerspectiveCamera(45, RATIO, 1, 4000);
  camera.position.set(-600, 600, 0);
  // Moving the camera with the mouse is simple enough - so this is provided. However, note that by default,
  // the keyboard moves the viewpoint as well
  cameraControls = new THREE.OrbitControls(camera, renderer.domElement);
  cameraControls.target.set(0, 400, 4);
  cameraControls.enabled = true;
  cameraControls.maxDistance = 2000;
  cameraControls.minDistance = 10;
  cameraControls.enabled = false;
  cameraControls.update();
}

function fillScene() {

  var groundMirror = new THREE.Reflector(2000, 2000, {
    clipBias: 0.003,
    textureWidth: WIDTH * window.devicePixelRatio,
    textureHeight: HEIGHT * window.devicePixelRatio,
    color: 0x777777,
    recursion: 1
  });
  groundMirror.rotateX(-Math.PI / 2);
  scene.add(groundMirror);

  var floorMaterial = new THREE.MeshLambertMaterial({
    color: 0xA9A9A9,
    opacity: 0.3,
    transparent: true
  });

  var floor = new THREE.Mesh(
    new THREE.BoxGeometry(2000, 2000, 1), floorMaterial
  );
  floor.position.set(0, 0, 0);
  floor.rotateX(-Math.PI / 2);
  scene.add(floor);

  scene.fog = new THREE.Fog(0x808080, 2000, 4000);

  // Some basic default lighting - in A2 complexity will be added

  scene.add(new THREE.AmbientLight(0x222222));

  var light = new THREE.DirectionalLight(0xffffff, 0.7);
  light.position.set(200, 500, 500);

  scene.add(light);

  light = new THREE.DirectionalLight(0xffffff, 0.9);
  light.position.set(-200, -100, -400);

  scene.add(light);

  // white spotlight shining from the side, casting a shadow

  var spotLight = new THREE.SpotLight(0xd3d3d3);
  spotLight.position.set(0, 740, 0);
  spotLight.target.position.set(0, 300, 0);

  spotLight.castShadow = true;

  spotLight.shadow.mapSize.width = 512;
  spotLight.shadow.mapSize.height = 512;

  spotLight.shadow.camera.near = 0.5;
  spotLight.shadow.camera.far = 500;
  spotLight.shadow.camera.fov = 30;

  scene.add(spotLight);

  spotLight = new THREE.SpotLight(0xffffff);
  spotLight.position.set(110, 740, 110);
  spotLight.target.position.set(-110, 300, -110);

  spotLight.castShadow = true;

  spotLight.shadow.mapSize.width = 512;
  spotLight.shadow.mapSize.height = 512;

  spotLight.shadow.camera.near = 0.5;
  spotLight.shadow.camera.far = 500;
  spotLight.shadow.camera.fov = 30;

  scene.add(spotLight);

  spotLight = new THREE.SpotLight(0xffffff);
  spotLight.position.set(-170, 320, -120);
  spotLight.target.position.set(-151, 280, -80);
  scene.add(spotLight);

  spotLight = new THREE.SpotLight(0xffffff);
  spotLight.position.set(-170, 320, -80);
  spotLight.target.position.set(-151, 280, -120);
  scene.add(spotLight);

  spotLight = new THREE.SpotLight(0x3300FF);
  spotLight.position.set(-180, 400, -50);
  spotLight.target.position.set(-180, 380, -50);
  scene.add(spotLight);

  spotLight = new THREE.SpotLight(0x3300FF);
  spotLight.position.set(-180, 400, 50);
  spotLight.target.position.set(-180, 380, 50);
  scene.add(spotLight);

  var mainLight = new THREE.PointLight(0x33ff00, 1.5, 1500);
  mainLight.position.set(-600, 200, 500);
  scene.add(mainLight);

  //A simple grid floor, the variables hint at the plane that this lies within
  // Later on we might install new flooring.
  var gridXZ = new THREE.GridHelper(2000, 100, new THREE.Color(0xCCCCCC), new THREE.Color(0x888888));
  scene.add(gridXZ);

  //Visualize the Axes - Useful for debugging, can turn this off if desired
  var axes = new THREE.AxisHelper(150);
  axes.position.y = 1;
  scene.add(axes);

  drawClawMachine();

}

// We want our document object model (a javascript / HTML construct) to include our canvas
// These allow for easy integration of webGL and HTML
function addToDOM() {
  var canvas = document.getElementById('canvas');
  canvas.appendChild(renderer.domElement);
}

// This is a browser callback for repainting
// Since you might change view, or move things
// We cant to update what appears
function animate() {
  window.requestAnimationFrame(animate);
  render();
  update();
}

// getDelta comes from THREE.js - this tells how much time passed since this was last called
// This might be useful if time is needed to make things appear smooth, in any animation, or calculation
// The following function stores this, and also renders the scene based on the defined scene and camera
function render() {
  scene.simulate();
  var delta = clock.getDelta();

  if (mixer1) {
    mixer1.update(delta);
    mixer2.update(delta);
  }

  cameraControls.update(delta);

  renderer.render(scene, camera);

}

function drawClawMachine() {

  //////////////////////////////
  // Some simple material definitions - This may become more complex in A2
  var textureLoader = new THREE.TextureLoader();

  var newTexture = new textureLoader.load("texture/myTexture.jpg");

  var logo = new textureLoader.load("texture/logo.jpg");

  var bodyMaterial = Physijs.createMaterial(new THREE.MeshPhongMaterial({
    map: newTexture,
    emissive: 0x444444
  }));
  bodyMaterial.color.setRGB(0.5, 0.5, 0.5);

  var transparentMaterial = new THREE.MeshLambertMaterial({
    color: 0xA9A9A9,
    opacity: 0.0,
    transparent: true
  });

  var logoMaterial = Physijs.createMaterial(new THREE.MeshPhongMaterial({
    map: logo
  }));

  var sign = new Physijs.BoxMesh(
    new THREE.BoxGeometry(1, 40, 80), logoMaterial, 0
  );
  sign.position.set(-151, 300, -100);
  scene.add(sign);

  // This is where the model gets created. Add the appropriate geometry to create your machine
  // You are not limited to using BoxGeometry, and likely want to use other types of geometry for pieces of your submission
  // Note that the actual shape, size and other factors are up to you, provided constraints listed in the assignment description are met


  // The base
  var base = new THREE.Mesh(
    new THREE.BoxGeometry(300, 400, 300), bodyMaterial);
  base.position.set(0, 200, 0);

  var plane = new Physijs.BoxMesh(
    new THREE.BoxGeometry(300, 1, 300), transparentMaterial, 0);
  plane.position.set(0, 400, 0);
  plane.receiveShadow = true;
  scene.add(plane);

  var prizeBin1 = new THREE.Mesh(
    new THREE.BoxGeometry(60, 150, 60));
  prizeBin1.position.set(-90, 325, 90);

  var prizeBin2 = new THREE.Mesh(
    new THREE.BoxGeometry(30, 60, 60));
  prizeBin2.position.set(-135, 280, 90);

  var base_BSP = new ThreeBSP(base);
  var prizeBin1_BSP = new ThreeBSP(prizeBin1);
  var prizeBin2_BSP = new ThreeBSP(prizeBin2);

  base_BSP = base_BSP.subtract(prizeBin1_BSP);
  base_BSP = base_BSP.subtract(prizeBin2_BSP);

  base = base_BSP.toMesh(bodyMaterial);
  scene.add(base);

  // Guard
  var guardOuter = new THREE.Mesh(
    new THREE.BoxGeometry(60, 30, 60));
  guardOuter.position.set(-90, 415, 90);

  var guardInner = new THREE.Mesh(
    new THREE.BoxGeometry(50, 30, 50));
  guardInner.position.set(-90, 415, 90);

  base_BSP = new ThreeBSP(base);
  guardOuter = new ThreeBSP(guardOuter);
  guardInner = new ThreeBSP(guardInner);

  var guard = guardOuter.subtract(guardInner);

  guard = guard.toMesh(bodyMaterial);
  scene.add(guard);

  // Supporting arms
  var stand1 = new Physijs.BoxMesh(
    new THREE.BoxGeometry(25, 400, 25), bodyMaterial, 0);
  stand1.position.set(-137.5, 600, -137.5);
  scene.add(stand1);

  var stand2 = new Physijs.BoxMesh(
    new THREE.BoxGeometry(25, 400, 25), bodyMaterial, 0);
  stand2.position.set(137.5, 600, -137.5);
  scene.add(stand2);

  var stand3 = new Physijs.BoxMesh(
    new THREE.BoxGeometry(25, 400, 25), bodyMaterial, 0);
  stand3.position.set(-137.5, 600, 137.5);
  scene.add(stand3);

  var stand4 = new Physijs.BoxMesh(
    new THREE.BoxGeometry(25, 400, 25), bodyMaterial, 0);
  stand4.position.set(137.5, 600, 137.5);
  scene.add(stand4);

  // Top Cover
  var top = new THREE.Mesh(
    new THREE.BoxGeometry(300, 50, 300), bodyMaterial);
  top.position.set(0, 825, 0);

  scene.add(top);

  // Console
  var PrismGeometry = function(vertices, height) {

    var Shape = new THREE.Shape();

    (function f(ctx) {

      ctx.moveTo(vertices[0].x, vertices[0].y);
      for (var i = 1; i < vertices.length; i++) {
        ctx.lineTo(vertices[i].x, vertices[i].y);
      }
      ctx.lineTo(vertices[0].x, vertices[0].y);

    })(Shape);

    var settings = {};
    settings.amount = height;
    settings.bevelEnabled = false;
    THREE.ExtrudeGeometry.call(this, Shape, settings);

  };

  PrismGeometry.prototype = Object.create(THREE.ExtrudeGeometry.prototype);

  var A = new THREE.Vector2(0, 0);
  var B = new THREE.Vector2(-80, 50);
  var C = new THREE.Vector2(0, 50);
  var height = 300;
  var geometry = new PrismGeometry([A, B, C], height);

  var console = new THREE.Mesh(geometry, new THREE.MeshPhongMaterial({
    color: 0x006600
  }));
  console.position.set(-150, 330, -150);
  scene.add(console);

  // Joystick
  joystick = new THREE.Mesh(
    new THREE.CylinderGeometry(15, 5, 50, 25), bodyMaterial);
  joystick.position.set(-190, 400, 0);
  scene.add(joystick);

  // Claw Mechanism
  clawX = 0;
  clawZ = 0;

  var frame1 = new THREE.Mesh(
    new THREE.BoxGeometry(300, 20, 20), bodyMaterial);
  frame1.position.set(0, 790, -137.5);
  scene.add(frame1);

  var frame2 = new THREE.Mesh(
    new THREE.BoxGeometry(300, 20, 20), bodyMaterial);
  frame2.position.set(0, 790, 137.5);
  scene.add(frame2);

  bar = new THREE.Mesh(
    new THREE.BoxGeometry(20, 20, 300), bodyMaterial);
  bar.position.set(0, 790, 0);
  scene.add(bar);

  bar_unit = new THREE.Mesh(
    new THREE.BoxGeometry(25, 25, 25), bodyMaterial);
  bar_unit.position.set(clawX, 790, clawZ);
  scene.add(bar_unit);

  wire = new THREE.Mesh(
    new THREE.BoxGeometry(2, 40, 2), bodyMaterial);
  wire.position.set(clawX, 767.5, clawZ);
  scene.add(wire);

  //claw
  claw = new THREE.Mesh(
    new THREE.SphereGeometry(4), bodyMaterial);
  claw.position.set(clawX, 745, clawZ);
  claw = new ThreeBSP(claw);

  var claw1a = new THREE.Mesh(
    new THREE.BoxGeometry(5, 30, 5));
  claw1a.rotation.x = -Math.PI / 3;
  claw1a.position.set(0, 742.5, 10);

  var claw1b = new THREE.Mesh(
    new THREE.BoxGeometry(5, 30, 5));
  claw1b.position.set(0, 722.5, 20);

  claw1a = new ThreeBSP(claw1a);
  claw1b = new ThreeBSP(claw1b);
  var claw1 = claw1a.union(claw1b);

  var claw2a = new THREE.Mesh(
    new THREE.BoxGeometry(5, 30, 5));
  claw2a.rotation.x = Math.PI / 3;
  claw2a.position.set(0, 742.5, -10);

  var claw2b = new THREE.Mesh(
    new THREE.BoxGeometry(5, 30, 5));
  claw2b.position.set(0, 722.5, -20);

  claw2a = new ThreeBSP(claw2a);
  claw2b = new ThreeBSP(claw2b);
  var claw2 = claw2a.union(claw2b);

  claw = (claw.union(claw1)).union(claw2);
  claw = claw.toMesh(bodyMaterial);

  scene.add(claw);

  var glassMaterial = new THREE.MeshLambertMaterial({
    color: 0x0000FF,
    opacity: 0.1,
    transparent: true
  });

  var glass = new Physijs.BoxMesh(
    new THREE.BoxGeometry(300, 400, 1), glassMaterial, 0
  );
  glass.position.set(0, 600, 150);
  scene.add(glass);

  glass = new Physijs.BoxMesh(
    new THREE.BoxGeometry(300, 400, 1), glassMaterial, 0
  );
  glass.position.set(0, 600, -150);
  scene.add(glass);

  glass = new Physijs.BoxMesh(
    new THREE.BoxGeometry(1, 400, 300), glassMaterial, 0
  );
  glass.position.set(150, 600, 0);
  scene.add(glass);

  glass = new Physijs.BoxMesh(
    new THREE.BoxGeometry(1, 400, 300), glassMaterial, 0
  );
  glass.position.set(-150, 600, 0);
  scene.add(glass);

  //Button & Coin slot
  var buttonMaterial = Physijs.createMaterial(new THREE.MeshPhongMaterial({
    color: 0x3300ff,
    emissive: 0xff0000,
    opacity: 0.7,
    transparent: true
  }));
  var button = new Physijs.SphereMesh(
    new THREE.SphereGeometry(10), buttonMaterial, 0);
  button.position.set(-180, 380, -50);
  scene.add(button);

  var coinSlot = new Physijs.BoxMesh(
    new THREE.BoxGeometry(10, 5, 3), buttonMaterial, 0);
  coinSlot.position.set(-180, 380, 50);
  scene.add(coinSlot);

}

function createObjects() {
  var objMaterial = Physijs.createMaterial(new THREE.MeshPhongMaterial({
    color: 0xffffff,
    emissive: 0x444444
  }));
  objMaterial.color.setRGB(0.5, 0.5, 0.5);

  var i;
  for (i = 0; i < 15; i++) {
    var object = new Physijs.BoxMesh(
      new THREE.BoxGeometry(5 + Math.random() * 50, 5 + Math.random() * 50, 5 + Math.random() * 50), objMaterial, 5 + Math.random() * 40);
    object.position.set(Math.random() * 100, (Math.random() * 500) + 450, Math.random() * 100);
    scene.add(object);

    object = new Physijs.SphereMesh(
      new THREE.SphereGeometry(10 + Math.random() * 25), objMaterial, 5 + Math.random() * 40);
    object.position.set(Math.random() * 100, (Math.random() * 500) + 450, Math.random() * 100);
    scene.add(object);
  }

}

function update() {
  keyboard.update();

  if (claw.position.y == 745) {

    if (keyboard.pressed("left")) {
      joystick.position.set(-190, 400, -15);
      joystick.rotation.x = -Math.PI / 4;

      if (bar_unit.position.z >= -112.5) {
        clawZ -= 2;
        claw.position.z = clawZ;
        wire.position.z = clawZ;
        bar_unit.position.z = clawZ;
      }
    }

    if (keyboard.pressed("right")) {
      joystick.position.set(-190, 400, 15);
      joystick.rotation.x = Math.PI / 4;

      if (bar_unit.position.z <= 112.5) {
        clawZ += 2
        claw.position.z = clawZ;
        wire.position.z = clawZ;
        bar_unit.position.z = clawZ;
      }
    }

    if (keyboard.pressed("up")) {
      joystick.position.set(-175, 400, 0);
      joystick.rotation.z = -Math.PI / 4;

      if (bar_unit.position.x <= 112.5) {
        clawX += 2;
        claw.position.x = clawX;
        wire.position.x = clawX;
        bar_unit.position.x = clawX;
        bar.position.x += 2;
      }
    }

    if (keyboard.pressed("down")) {
      joystick.position.set(-205, 400, 0);
      joystick.rotation.z = Math.PI / 4;

      if (bar_unit.position.x >= -112.5) {
        clawX -= 2;
        claw.position.x = clawX;
        wire.position.x = clawX;
        bar_unit.position.x = clawX;
        bar.position.x -= 2;
      }
    }

    if (keyboard.up("space")) {
      //Claw
      var position1 = new THREE.VectorKeyframeTrack('.position', [0, 1, 2, 3], [clawX, 745, clawZ, clawX, 425, clawZ, clawX, 425, clawZ, clawX, 745, clawZ]);
      var scale1 = new THREE.VectorKeyframeTrack('.scale', [1, 2, 3, 4], [1, 1, 1, 1, 1, 0.5, 1, 1, 0.5, 1, 1, 1]);

      var clip1 = new THREE.AnimationClip('Action', 5, [position1, scale1]);
      clip1.timeScale = 1 / 2;

      mixer1 = new THREE.AnimationMixer(claw);

      var clipAction1 = mixer1.clipAction(clip1);
      clipAction1.setLoop(THREE.LoopOnce).play();

      //wire
      var scale2 = new THREE.VectorKeyframeTrack('.scale', [0, 1, 2, 3], [1, 1, 1, 1, 8.8125, 1, 1, 8.8125, 1, 1, 1, 1]);
      var position2 = new THREE.VectorKeyframeTrack('.position', [0, 1, 2, 3], [clawX, 767.5, clawZ, clawX, 611.25, clawZ, clawX, 611.25, clawZ, clawX, 767.5, clawZ]);

      var clip2 = new THREE.AnimationClip('Action', 5, [scale2, position2]);

      mixer2 = new THREE.AnimationMixer(wire);

      var clipAction2 = mixer2.clipAction(clip2);
      clipAction2.setLoop(THREE.LoopOnce).play();

    }

    if (keyboard.up("V")) {
      if (viewpoint == 0) {
        camera.position.set(-600, 600, 0);
        viewpoint = 1;
      } else {
        camera.position.set(-1500, 700, -300);
        viewpoint = 0;
      }
    }

    if (keyboard.up("left") || keyboard.up("right") || keyboard.up("up") || keyboard.up("down")) {
      joystick.position.set(-190, 400, 0);
      joystick.rotation.x = 0;
      joystick.rotation.z = 0;
    }

  }

}

// Since we're such talented programmers, we include some exception handeling in case we break something
// a try and catch accomplished this as it often does
// The sequence below includes initialization, filling up the scene, adding this to the DOM, and animating (updating what appears)
try {
  init();
  addToDOM();
  fillScene();
  createObjects();
  animate();
} catch (error) {
  console.log("You did something bordering on utter madness. Error was:");
  console.log(error);
}
