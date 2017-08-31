/*
 * Copyright 2013 Boris Smus. All Rights Reserved.

 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */


function RoomEffectsSample(inputs) {
    var ctx = this;




    for (var i = 0; i < inputs.length; i++) {
        inputs[i].addEventListener('change', function(e) {
            var value = e.target.value;
            ctx.setImpulseResponse(value);
        });
    }

    this.impulseResponses = [];

    this.recorder = new (window.AudioContext || window.webkitAudioContext)();
    this.mssource = null;
    this.node = context.createScriptProcessor(1024, 2, 2);

    if (navigator.getUserMedia) {
        navigator.getUserMedia({audio: true}, function (stream) {
            ctx.mssource = context.createMediaStreamSource(stream);
        }, function (e) {
            window.alert('Please enable your microphone to begin recording');
        });
    } else {
        window.alert('Your browser does not support recording');
    }


    this.channelTotal = 2;
    this.secondsMax = 120.0;
    this.frameMax = context.sampleRate * this.secondsMax;

    this.currentRecordingFrame = 0;

    this.buttonStatus = 0; // 0: grayed  1: ready to record 2: click to record 3: click to speak

    this.convolver = context.createConvolver();


    this.buffer =  context.createBuffer(ctx.channelTotal, ctx.frameMax, context.sampleRate);

    // Load all of the needed impulse responses and the actual sample.
    var loader = new BufferLoader(context, [
        "sounds/impulse-response/telephone.wav",
        "sounds/impulse-response/muffler.wav",
        "sounds/impulse-response/spring.wav",
        "sounds/impulse-response/echo.wav"
    ], onLoaded);

    function onLoaded(buffers) {
//        ctx.buffer = buffers[0];

        ctx.impulseResponses = buffers.splice(0);
        ctx.impulseResponseBuffer = ctx.impulseResponses[3];

        var button = document.querySelector('button');
        button.removeAttribute('disabled');
        button.innerHTML = '按住说话';
    }
    loader.load();
}

RoomEffectsSample.prototype.setImpulseResponse = function(index) {
    this.impulseResponseBuffer = this.impulseResponses[index];
    // Change the impulse response buffer.
    this.convolver.buffer = this.impulseResponseBuffer;
};


RoomEffectsSample.prototype.pushToTalk = function(event) {
    console.log("push To Talk");

    event.preventDefault();

    var ctx = this;

    var button = document.querySelector('button');
    button.innerHTML = '松开回放声音';
    button.color = 0x0000FF;

    // Stop playback
    if (this.source)
        this.source.disconnect();

    this.currentRecordingFrame = 0;


    this.node.onaudioprocess = function(audioProcessingEvent) {
//        console.log("onaudioprocess");

        var inputBuffer = audioProcessingEvent.inputBuffer;
        var outputBuffer = audioProcessingEvent.outputBuffer;

        for (var channel = 0; channel < ctx.channelTotal; channel++) {
            var inputData = inputBuffer.getChannelData(channel);
            var bufferData = ctx.buffer.getChannelData(channel);
            for (var sample = 0; sample < inputBuffer.length; sample++) {
                if (ctx.currentRecordingFrame < ctx.frameMax) {
                    bufferData[ctx.currentRecordingFrame++] = inputData[sample];
//                    console.log(ctx.currentRecordingFrame + "  :  " + inputData[sample]);
                }
            }
        }
    }

    this.mssource.connect(this.node);

    this.node.connect(context.destination);

//    this.mssource.start();


};


RoomEffectsSample.prototype.releaseToSpeak = function(event) {
    console.log("release to Speak");

    event.preventDefault();

    var button = document.querySelector('button');
    button.disabled = true;

    this.mssource.disconnect();
    this.node.disconnect();
//    this.mssource.stop();
    this.node.onaudioprocess = null;


    // Make a source node for the sample.
    this.source = context.createBufferSource();
    this.source.buffer = this.buffer;
    this.source.onended = this.audioEnded;

    // Make a convolver node for the impulse response.

    this.convolver.buffer = this.impulseResponseBuffer;
    // Connect the graph.
    this.source.connect(this.convolver);
    this.convolver.connect(context.destination);

    //this.source.connect(context.destination);
    // Save references to important nodes.


    // Start playback.
    this.source.start(0, 0, this.currentRecordingFrame/context.sampleRate);
};

RoomEffectsSample.prototype.audioEnded = function(event) {
    console.log("audioEnded");
    var button = document.querySelector('button');
    button.removeAttribute('disabled');
    button.innerHTML = '按住说话'
}

RoomEffectsSample.prototype.BtnClicked = function() {
    console.log("buttonStatus : " + this.buttonStatus);

    if (this.buttonStatus == 1) {
        this.pushToTalk();
        button.innerHTML = 'Click to speak';
        this.buttonStatus = 2;
    } else if (this.buttonStatus == 2){
        this.releaseToSpeak();
        button.innerHTML = 'Click to record';
        this.buttonStatus = 1;
    }
};