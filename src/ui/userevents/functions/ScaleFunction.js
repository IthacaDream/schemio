/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import {playInAnimationRegistry} from '../../animations/AnimationRegistry';
import Animation from '../../animations/Animation';
import { convertTime } from '../../animations/ValueAnimation';
import utils from '../../utils';
import EditorEventBus from '../../components/editor/EditorEventBus';



class ScaleAnimation extends Animation {
    constructor(item, args, schemeContainer, resultCallback) {
        super();
        this.item = item;
        this.args = args;
        this.schemeContainer = schemeContainer;
        this.resultCallback = resultCallback;
        this.elapsedTime = 0.0;
        this.originalArea = utils.clone(item.area);
        this.destinationScale = {
            sx: parseFloat(args.scaleX),
            sy: parseFloat(args.scaleY),
        };

    }

    init() {
        return true;
    }

    play(dt) {
        if (this.args.animated && this.args.duration > 0.00001) {
            this.elapsedTime += dt;

            const t = Math.min(1.0, this.elapsedTime / (this.args.duration * 1000));

            let convertedT = convertTime(t, this.args.movement);
            let proceed = true;
            if (t >= 1.0){
                proceed = false;
                convertedT = 1.0;
            }

            this.item.area.sx = this.originalArea.sx * (1.0 - convertedT) + this.destinationScale.sx * convertedT;
            this.item.area.sy = this.originalArea.sy * (1.0 - convertedT) + this.destinationScale.sy * convertedT;

            EditorEventBus.item.changed.specific.$emit(this.schemeContainer.editorId, this.item.id);
            this.schemeContainer.updateChildTransforms(this.item);
            this.schemeContainer.readjustItemAndDescendants(this.item.id);

            return proceed;
        } else {
            this.item.area.sx = this.destinationScale.sx;
            this.item.area.sy = this.destinationScale.sy;
            EditorEventBus.item.changed.specific.$emit(this.schemeContainer.editorId, this.item.id);
            this.schemeContainer.updateChildTransforms(this.item);
            this.schemeContainer.readjustItemAndDescendants(this.item.id);
        }
        return false;
    }



    destroy() {
        if (!this.args.inBackground) {
            this.resultCallback();
        }
    }
}

export default {
    name: 'Scale',

    description: 'Changes width and height of the item',

    args: {
        scaleX          : {name: 'Scale X',           type: 'number', value: 1.5, min: 0, softMax: 10},
        scaleY          : {name: 'Scale Y',           type: 'number', value: 1.5, min: 0, softMax: 10},
        animated        : {name: 'Animated',          type: 'boolean',value: true},
        duration        : {name: 'Duration (sec)',    type: 'number', value: 2.0, depends: {animated: true}, min: 0, softMax: 10, step: 0.1},
        movement        : {name: 'Movement',          type: 'choice', value: 'ease-out', options: ['linear', 'smooth', 'ease-in', 'ease-out', 'ease-in-out', 'bounce'], depends: {animated: true}},
        inBackground    : {name: 'In Background',     type: 'boolean',value: false, description: 'Play animation in background without blocking invocation of other actions', depends: {animated: true}}
    },

    argsToShortString(args) {
        return `x: ${args.scaleX}, y: ${args.scaleY}` + (args.animated ? ', animated' : '');
    },

    execute(item, args, schemeContainer, userEventBus, resultCallback) {
        if (item) {
            if (args.animated) {
                playInAnimationRegistry(schemeContainer.editorId, new ScaleAnimation(item, args, schemeContainer, resultCallback), item.id, this.name);
                if (args.inBackground) {
                    resultCallback();
                }
                return;
            } else {
                item.area.sx = parseFloat(args.scaleX);
                item.area.sy = parseFloat(args.scaleY);
                EditorEventBus.item.changed.specific.$emit(schemeContainer.editorId, item.id);
                schemeContainer.updateChildTransforms(item);
                schemeContainer.readjustItemAndDescendants(item.id);
            }
        }
        resultCallback();
    }
};


