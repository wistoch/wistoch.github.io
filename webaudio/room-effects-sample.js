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


    var btn = document.getElementById("pushBtn");
    btn.addEventListener("touchstart", this.pushToTalk,false);
    btn.addEventListener("touchend", this.releaseToPlay, false);

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
            this.mssource = context.createMediaStreamSource(stream);
        }, function (e) {
            window.alert('Please enable your microphone to begin recording');
        });
    } else {
        window.alert('Your browser does not support recording');
    }

    this.buffer = null;
    this.channelTotal = 2;
    this.secondsMax = 2.0;
    this.frameMax = context.sampleRate * this.secondsMax;

    this.currentRecordingFrame = 0;


    // Load all of the needed impulse responses and the actual sample.
    var loader = new BufferLoader(context, [
        "sounds/impulse-response/telephone.wav",
        "sounds/impulse-response/muffler.wav",
        "sounds/impulse-response/spring.wav",
        "sounds/impulse-response/echo.wav"
    ], onLoaded);

    function onLoaded(buffers) {
//        ctx.buffer = buffers[0];
        ctx.buffer = context.createBuffer(ctx.channelTotal, ctx.frameMax, context.sampleRate);

        ctx.impulseResponses = buffers.splice(0);
        ctx.impulseResponseBuffer = ctx.impulseResponses[0];

        var button = document.querySelector('button');
        button.removeAttribute('disabled');
        button.innerHTML = 'Click to record';
    }
    loader.load();
}

RoomEffectsSample.prototype.setImpulseResponse = function(index) {
    this.impulseResponseBuffer = this.impulseResponses[index];
    // Change the impulse response buffer.
    this.convolver.buffer = this.impulseResponseBuffer;
};


RoomEffectsSample.prototype.pushToTalk = function() {
    // Stop playback
    this.source[this.source.stop ? 'stop': 'noteOff'](0);

    this.currentRecordingFrame = 0;


    this.node.onaudioprocess = function(audioProcessingEvent) {
        var inputBuffer = audioProcessingEvent.inputBuffer;
        var outputBuffer = audioProcessingEvent.outputBuffer;

        for (var channel = 0; channel < this.channelTotal; channel++) {
            var inputData = inputBuffer.getChannelData(channel);
            var bufferData = this.buffer.get
            for (var sample = 0; sample < inputBuffer.length; sample++) {
                if (this.currentRecordingFrame < this.frameMax) {
                    this.buffer[this.currentRecordingFrame++] = inputData[sample];
                }
            }
        }
    }

    this.mssource.connect(node);

    this.node.connect(context.destination);

    this.mssource.start();


};


RoomEffectsSample.prototype.releaseToSpeak = function() {
    this.mssource.disconnect();
    this.node.disconnect();
    this.mssource.stop();
    this.node.onaudioprocess = null;


    // Make a source node for the sample.
    var source = context.createBufferSource();
    source.buffer = this.buffer;

    // Make a convolver node for the impulse response.
    var convolver = context.createConvolver();
    convolver.buffer = this.impulseResponseBuffer;
    // Connect the graph.
    source.connect(convolver);
    convolver.connect(context.destination);
    // Save references to important nodes.
    this.source = source;
    this.convolver = convolver;
    // Start playback.
    this.source[this.source.start ? 'start' : 'noteOn'](0, 0, this.currentRecordingFrame*context.sampleRate);
};

RoomEffectsSample.prototype.BtnClicked = function() {
    var button = document.querySelector('button');
    if ( button.innerHTML.indexOf('record') > 0 ) {
        this.pushToTalk();
        button.innerHTML = 'Click to speak';
    } else {
        this.releaseToSpeak();
        button.innerHTML = 'Click to record';
    }
};