/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { createItemBasedScope, parseItemScript } from "./ScriptFunction";
import ConditionFunctionEditor from '../../components/editor/properties/behavior/ConditionFunctionEditor.vue';


const conditionBranchOptions = ['pass', 'skip-next', 'break-event', 'send-event'];

export default {
    name: 'Condition',

    description: 'Checkes whether user defined expressions returns true and executes specified command',

    args: {
        expression  : {name: 'Expression', type: 'script', value: '', description: 'A Schemio script expression that is executed as part of condition'},
        success     : {name: 'If true', type: 'choice', value: 'pass', options: conditionBranchOptions},
        successEvent: {name: 'Success event', type: 'string', value: '', depends: {success: 'send-event'},
            description: 'Sends an event to itself if condition is true'
        },
        fail        : {name: 'Else', type: 'choice', value: 'skip-next', options: conditionBranchOptions},
        failEvent   : {name: 'Else event', type: 'string', value: '', depends: {success: 'send-event'},
            description: 'Sends an event to itself if condition is false'
        },
    },

    editorComponent: ConditionFunctionEditor,

    argsToShortString(args) {
        const success = args.success === 'send-event' ? `send-event "${args.successEvent}"` : args.success;
        const fail = args.fail === 'send-event' ? `send-event "${args.failEvent}"` : args.fail;
        return `${success} if ${args.expression} else ${fail}`;
    },

    executeWithBranching(item, args, schemeContainer, userEventBus, resultCallback) {
        const scriptAST = parseItemScript(args.expression);
        if (!scriptAST) {
            resultCallback({skip: 0, break: false});
            return;
        }

        const handleBranch = (op, customEvent) => {
            if (op === 'pass') {
                resultCallback({skip: 0, break: false});
            } else if (op === 'skip-next') {
                resultCallback({skip: 1, break: false});
            } else if (op === 'break-event') {
                resultCallback({skip: 0, break: true});
            } else if (op === 'send-event') {
                userEventBus.emitItemEvent(item.id, customEvent);
                resultCallback({skip: 0, break: false});
            } else {
                resultCallback({skip: 0, break: false});
            }
        };

        const scope = createItemBasedScope(item, schemeContainer, userEventBus);
        try {
            const result = scriptAST.evalNode(scope);

            if (result) {
                handleBranch(args.success, args.successEvent);
            } else {
                handleBranch(args.fail, args.failEvent);
            }
        } catch (err) {
            console.error(err);
            resultCallback({skip: 0, break: false});
            return;
        }
    }
}
