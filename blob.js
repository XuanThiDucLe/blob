/**
 *
 * Hochschule für Gestaltung Schwäbisch Gmünd
 * Sommersemester 2018
 * 2. Semester
 *
 * 3-dimensionale Gundlagen im medialen Raum
 * Dozent: Franklin Hernández-Castro
 *
 * Interaktionsgestaltung
 * Internet der Dinge – Gestaltung vernetzter Systeme
 *
 * Jonathan Bruckbauer, IoT2
 * Xuan Le, IoT2
 * Shkendie Sopa, Ig2
 * Florian Trah, IoT2
 *
 */

window.onload = onReady;

var videoOp;

// mouse position any time
var mouseX = 5000;
var mouseY = 5000;

var frameCounter;
var canvas;
var ctx;

// Background Image
var imgbg = new Image();
imgbg.src = './images/Background_05.2.png';

// Lamp Image
var imgLamp = new Image();
imgLamp.src = './images/Lamp_01.1.png';

// Shine Image animation
var shineArray = [];
var timeShine = 0;
var cycleShine = 0;

// Bubble Image
var imgbubble = new Image();
imgbubble.src = './images/Bubble_06.1.svg';

// Hint
var noise_bg = new Image();
noise_bg.src = './images/noise_bg.png';

var light_bg = new Image();
light_bg.src = './images/light_bg.png';

// for frame rate
var filterStrength = 20;
var frameTime = 0, lastLoop = new Date, thisLoop;

// for video/camera
var video;

// var imgInScreen;
var prevImageData;
var rgba;
var back, backCxt;
var canvasHeight, canvasWidth, videoHeight, videoWidth, xRate, yRate;

var physics = new Physics(0, 0.5);
var myParticles = [];
var bubbleArray = [];
var threshold = 50;

// Lamp Stuff
var lightOn = 0;
var revX, lampY, lampYRate;

// Hint
var clap = 0;

var mostBrightnest = 0;

function Blubblez(n) {
    this.id = n;
    this.x = 0;
    this.y = 0;
    this.life = 100;
    this.r = 0;
    this.g = 0;
    this.b = 0;
    this.particle;
    this.orgx = 0;
    this.velocityState = this.velocityX;
    this.velocityX = 0;
    this.imgScale = 1;
}


// Bubble Animation & Life
Blubblez.prototype.updatePosition = function (id) {
    this.life -= 0.8;
    this.velocityX += 0.05;

    // Original x Position for x Animation
    if (this.life > 99 && this.orgx != this.particle.position.x) {
        this.orgx = this.particle.position.x;
    }

    // Animation of Bubble
    if (this.life <= 100) {
        // Bubble shrinking
        if (this.imgScale >= 0.01) {
            this.imgScale -= 0.01;
        }

        // Velocity y
        this.particle.velocity.y = -2;

        // Velocity x
        this.particle.velocity.x = this.velocityState;
        if (this.particle.position.x > this.orgx + 5) {
            this.velocityState = -this.velocityX;
        } else if (this.particle.position.x < this.orgx - 5) {
            this.velocityState = this.velocityX;
        }
    }

    // Bubble reset
    if (this.life <= 0) {
        this.d = 0;
        this.particle.position.x = (this.x - Math.floor(videoWidth * 0.25)) * xRate;
        this.particle.position.y = this.y * yRate;
        this.particle.velocity.x = 0;
        this.particle.velocity.y = 0;
        this.imgScale = 0.25 + (Math.round(Math.random() * 4)) / 4;
    }
}


// Clap detection

var Recording = function (cb) {
    var recorder = null;
    var recording = true;
    var audioInput = null;
    var volume = null;
    var audioContext = null;
    var callback = cb;

    navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia ||
        navigator.mozGetUserMedia || navigator.msGetUserMedia;

    if (navigator.getUserMedia) {
        navigator.getUserMedia({audio: true},
            function (e) { //success
                var AudioContext = window.AudioContext || window.webkitAudioContext;
                audioContext = new AudioContext();
                volume = audioContext.createGain(); // creates a gain node
                audioInput = audioContext.createMediaStreamSource(e); // creates an audio node from the mic stream
                audioInput.connect(volume);// connect the stream to the gain node
                recorder = audioContext.createScriptProcessor(2048, 1, 1);

                recorder.onaudioprocess = function (e) {
                    if (!recording) return;
                    var left = e.inputBuffer.getChannelData(0);
                    callback(new Float32Array(left));
                };
                volume.connect(recorder);
                recorder.connect(audioContext.destination);
            },
            function (e) { //failure
                alert('Error capturing audio.');
            }
        );
    } else {
        alert('getUserMedia not supported in this browser.');
    }
}

var lastClap = (new Date()).getTime();

function detectClap(data) {
    var t = (new Date()).getTime();
    if (t - lastClap < 1000) return false; // Time until next clap
    var zeroCrossings = 0, highAmp = 0;
    for (var i = 1; i < data.length; i++) {
        if (Math.abs(data[i]) > 0.25) highAmp++;
        if (data[i] > 0 && data[i - 1] < 0 || data[i] < 0 && data[i - 1] > 0) zeroCrossings++;
    }
    if (highAmp > 40 && zeroCrossings > 60) {
        lastClap = t;
        return true;
    }
    return false;
}

var rec = new Recording(function (data) {
    if (detectClap(data)) {
        if (clap < 4) {
            clap++;
        } else {
            clap = 0;
        }
    }
});


function onReady() {
    var vid = document.getElementById("myVideo");
    vid.onended = function () {
        vid.remove();
        videoOp = true;
        // window.onload = onReady;
        // first function call

        // Inicialization -------------------------------------------------------------------------------
        canvas = document.getElementById('canvas');
        ctx = canvas.getContext('2d');
        frameCounter = 0;
        canvas.addEventListener('mousemove', pick);

        // Grab elements, create settings, etc.
        video = document.getElementById('video');

        back = document.createElement('canvas');
        backCxt = back.getContext('2d');

        // Get access to the camera
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia({video: true}).then(function (stream) {
                //video.src = window.URL.createObjectURL(stream); // stream
                video.srcObject = stream;
            });
        }

        videoWidth = video.width;
        videoHeight = video.height;
        canvasWidth = canvas.width;
        canvasHeight = canvas.height;
        xRate = canvasWidth / videoWidth * 2; // because canvas rate is 1:2
        yRate = canvasHeight / videoHeight;


        // Images loading into shineArray
        for (var i = 0; i < 7; i++) {
            shineArray[i] = new Image();
            shineArray[i].src = './images/Shine_01.' + (i + 1) + '.png';
        }


        prevImageData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);


        for (var y = 0; y < videoHeight; y++) {
            for (var x = Math.floor(videoWidth * 0.75); x > Math.floor(videoWidth * 0.25); x--) {
                var myCurrentParticle = physics.makeParticle(10, x * xRate, y * yRate);
                b = new Blubblez(0);
                b.x = x;
                b.y = y;
                b.r = 0;
                b.g = 0;
                b.b = 0;
                b.life = 100;
                b.particle = myCurrentParticle;
                b.orgx = 0;
                b.velocityState = b.velocityX;
                b.velocityX = 0;
                b.imgScale = 1;
                bubbleArray.push(b);
            }
        }


        physics.onUpdate().play();

        draw();
        console.log("ready to gooo!");
    }
} // end onReady()

var posT = 0, timer = 0;
var posA = 0;
var let1 = 183, let2 = 183;


// draw function -------------------------------------------------------------------------------------------------------
function draw() {
    var thisFrameTime = (thisLoop = new Date) - lastLoop;


    if (timer < let1 + 300) {
        if (timer < let1) {
            posT++;
        } else {
        }
        timer++;
    } else if (timer < let1 + 783) {
        if (timer < let1 + 483) {
            posT--;
        } else {
        }
        timer++
    } else if (timer < let2 + 1266) {
        if (timer < let2 + 966) {
            posA++;
        } else {
        }
        timer++;
    } else if (timer < let2 + 1749) {
        if (timer < let2 + 1449) {
            posA--;
        } else {
        }
        timer++
    } else {
        timer = 0;
    }

    // Background Image
    ctx.drawImage(imgbg, 0, 0, canvasWidth, canvasHeight);

    // Shine Images
    if (timeShine == 10) {
        if (cycleShine == 6) {
            cycleShine = 0;
        } else {
            cycleShine++;
        }
        timeShine = 0;
    } else {
        timeShine++;
    }

    ctx.save();
    ctx.globalAlpha = 0.2;
    ctx.drawImage(shineArray[cycleShine], 0, 0, canvasWidth, canvasHeight);
    ctx.restore();


    // Grab the pixel data from the backing canvas
    backCxt.drawImage(video, 0, 0, videoWidth, videoHeight);
    // imgInScreen = backCxt.getImageData(0, 0, videoWidth, videoHeight);


    // Printing Bubbles
    var pixel = backCxt.getImageData(0, 0, videoWidth, videoHeight);
    var data = pixel.data;
    for (var y = 0; y < videoHeight; y++) {
        for (var x = Math.floor(videoWidth * 0.25); x < Math.floor(videoWidth * 0.75); x++) {
            // var pixel = backCxt.getImageData(0, 0, videoWidth, videoHeight); // muss das in jedem durhclauf passieren?
            // var data = pixel.data;
            var bub = pixelData(data, prevImageData, x, y);
            if (bub.d > threshold) {
                var b = bubbleArray[60 - x - 1 + y * 40]; //Math.floor(videoWidth * 0.75) - x - 1 + y * Math.floor(videoWidth * 0.5)
                b.x = 80 - x - 1; //Math.floor(videoWidth) - x - 1;
                b.y = y;
                b.r = bub.r;
                b.g = bub.g;
                b.b = bub.b;
                b.life = 100;
                b.d = bub.d;
                b.orgx = b.particle.position.x;
                b.particle.position.x = (b.x - 20) * 10; //(b.x - Math.floor(videoWidth * 0.25)) * xRate;
                b.particle.position.y = b.y * yRate;
                b.particle.velocity.x = 0;
                b.particle.velocity.y = 0;
                b.velocityState = b.velocityX;
                b.velocityX = 0;
                b.imgScale = 0.5 + (Math.round(Math.random() * 4)) / 4;
            }
        }
    }


    for (var i = 0; i < bubbleArray.length; i++) {
        var b = bubbleArray[i];
        b.updatePosition(i);

        if (b.d > threshold) {
            if (clap == 1) {
                //Colorful blue
                var colP = "rgba(" + (b.r + (255 - Math.floor(b.particle.position.x * 1))) + "," + (b.g) + "," + (b.b + 10 + Math.floor(b.particle.position.x * 4 + b.particle.position.y * (0.15))) + "," + 0.6 + ")";
                drawParticle(ctx, b.particle.position.x, b.particle.position.y, colP, b.imgScale);
            } else if (clap == 2) {
                //Green
                var colP = "rgba(" + (b.r - 20) + "," + (b.g + 80) + "," + (b.b + 50) + "," + 0.6 + ")";
                drawParticle(ctx, b.particle.position.x, b.particle.position.y, colP, b.imgScale);
            } else if (clap == 3) {
                //Colorful pink
                var colP = "rgba(" + (b.r + Math.floor(b.particle.position.y * 0.5 + 100)) + "," + (b.g + Math.floor(b.particle.position.y * 0.5 - 200)) + "," + (b.b) + "," + 0.6 + ")";
                drawParticle(ctx, b.particle.position.x, b.particle.position.y, colP, b.imgScale);
            } else {
                //Default
                var colP = "rgba(" + (b.r - 20) + "," + (b.g - 20) + "," + (b.b) + "," + 0.6 + ")";
                drawParticle(ctx, b.particle.position.x, b.particle.position.y, colP, b.imgScale);
            }
        }
    }
    prevImageData = backCxt.getImageData(0, 0, videoWidth, videoHeight);


    // Hints
    ctx.drawImage(noise_bg, -noise_bg.width + posT, 20, noise_bg.width, noise_bg.height);
    ctx.drawImage(light_bg, 220 + light_bg.width - posA, 20, light_bg.width, light_bg.height);

    if (lightOn == 1) {
        ctx.drawImage(imgLamp, 0 - imgLamp.width / 2 + revX, (0 - imgLamp.height / 2 + Math.floor(lampY * lampYRate * 0.8)), imgLamp.width, imgLamp.height);
        lightOn++;
    } else if (lightOn < 50 && lightOn > 0) {
        ctx.drawImage(imgLamp, 0 - imgLamp.width / 2 + revX, (0 - imgLamp.height / 2 + Math.floor(lampY * lampYRate * 0.8)), imgLamp.width, imgLamp.height);
        lightOn = 0;
    }
    else {
        ctx.drawImage(imgLamp, 0, 0, 0, 0);
    }


    // FrameRate calculating
    frameTime += (thisFrameTime - frameTime) / filterStrength;
    lastLoop = thisLoop;
    /*var fpsOut = document.getElementById('frameRate');
    fpsOut.innerHTML = "current frame = " + frameCounter + "   currente frame rate = " + (1000 / frameTime).toFixed(1) + " fps";*/
    frameCounter += 1;
    requestAnimFrame(draw);
}


function drawParticle(ctx, x, y, colP, imgScale) {

    var rBubbleArc = 4.5 * imgScale; //(imgbubble.width / 2) * imgScale;
    var xBubbleArc = x + rBubbleArc;
    var yBubbleArc = y + rBubbleArc;

    ctx.save();
    ctx.fillStyle = colP;
    ctx.beginPath();
    ctx.arc(xBubbleArc, yBubbleArc, rBubbleArc, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}


function pixelData(data, prevImageData, x, y) {
    var cr, cg, cb, ca, pr, pg, pb, pa, cx, cy, offset = x * 4 + y * 4 * prevImageData.width;
    cr = data[offset];
    cg = data[offset + 1];
    cb = data[offset + 2];
    ca = data[offset + 3];
    pr = prevImageData.data[offset];
    pg = prevImageData.data[offset + 1];
    pb = prevImageData.data[offset + 2];
    pa = prevImageData.data[offset + 3];


    var diff = Math.abs(pr - cr) + Math.abs(pg - cg) + Math.abs(pb - cb);
    var obj = new Object();

    var thresholdRed = 20;
    var thresholdBlue = 30;
    var brightness = (3 * data[offset] + 4 * data[offset + 1] + data[offset + 2]) >>> 3;

    if (diff > threshold) {
        if ((cg - cr) >= thresholdRed && (cg - cb) >= thresholdBlue) {
            if ((mostBrightnest - (brightness - 50)) <= brightness) {
                mostBrightnest = brightness;
                obj.r = 32;
                obj.g = 178;
                obj.b = 170;
                obj.a = 255;

                lampY = y;
                lampYRate = yRate;
                revX = 400 - ((x - 20) * 10);

                lightOn = 1;
            }
        }
        else {
            obj.r = cr;
            obj.g = cg;
            obj.b = cb;
            obj.a = 0.5;
        }
    }
    obj.d = diff;
    return obj;
}


// for events ----------------------------------------------------------------------------------------------------------
function pick(event) {
    mouseX = event.layerX;
    mouseY = event.layerY;

    var pixel = ctx.getImageData(mouseX, mouseY, 1, 1);
    var data = pixel.data;
    rgba = 'rgba(' + data[0] + ', ' + data[1] + ', ' + data[2] + ', ' + (data[3] / 255) + ')';
}


// for animation request -----------------------------------------------------------------------------------------------
window.requestAnimFrame = (function () {
    return window.requestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        window.oRequestAnimationFrame ||
        window.msRequestAnimationFrame ||
        function (/* function */ callback, /* DOMElement */ element) {
            window.setTimeout(callback, 1000 / 60);
        };
})();