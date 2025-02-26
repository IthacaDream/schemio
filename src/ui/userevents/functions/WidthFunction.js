/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import {playInAnimationRegistry} from '../../animations/AnimationRegistry';
import ValueAnimation, { convertTime } from '../../animations/ValueAnimation';
import EditorEventBus from '../../components/editor/EditorEventBus';


export default {
    name: 'Size (Width)',

    description: 'Changes width of an item',

    args: {
        width           : {name: 'Width',             type: 'number', value: 50, min: 0, softMax: 100},
        animated        : {name: 'Animated',          type: 'boolean',value: false},
        duration        : {name: 'Duration (sec)',    type: 'number', value: 1.0, depends: {animated: true}, min: 0, softMax: 10, step: 0.1},
        animationType   : {name: 'Animation Type',    type: 'choice', value: 'linear', options: ['linear', 'smooth', 'ease-in', 'ease-out', 'ease-in-out', 'bounce'], depends: {animated: true}},
        inBackground    : {name: 'In Background',     type: 'boolean',value: false, description: 'Play animation in background without blocking invocation of other actions', depends: {animated: true}}
    },

    execute(item, args, schemeContainer, userEventBus, resultCallback) {
        if (item) {
            if (args.animated) {
                const initialWidth = item.area.w;

                playInAnimationRegistry(schemeContainer.editorId, new ValueAnimation({
                    durationMillis: args.duration * 1000,
                    animationType: args.animationType,
                    update: (t) => {
                        item.area.w = initialWidth * (1 - t) + args.width * t;
                        schemeContainer.updateChildTransforms(item);
                        EditorEventBus.item.changed.specific.$emit(schemeContainer.editorId, item.id);
                        schemeContainer.readjustItemAndDescendants(item.id);
                    },
                    destroy: () => {
                        if (!args.inBackground) {
                            resultCallback();
                        }
                    }
                }), item.id, this.name);
                if (args.inBackground) {
                    resultCallback();
                }
                return;
            } else {
                item.area.w = args.width;
                schemeContainer.updateChildTransforms(item);
                EditorEventBus.item.changed.specific.$emit(schemeContainer.editorId, item.id);
                schemeContainer.readjustItemAndDescendants(item.id);
            }
        }
        resultCallback();
    }
}