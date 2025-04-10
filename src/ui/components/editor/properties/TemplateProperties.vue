<template>
    <div class="template-properties">
        <i v-if="isLoading" class="fas fa-spinner fa-spin fa-1x"></i>
        <div v-if="errorMessage" class="msg msg-error">{{ errorMessage }}</div>
        <div v-if="templateNotFound" class="msg msg-error">Template for this item could not be found</div>


        <div v-if="template">
            <h4>{{ template.name }}</h4>
            <p class="hint hint-small" v-if="template.description">{{ template.description }}</p>

            <!-- <ArgumentsEditor v-if="template.args"
                :key="`item-${item.id}-template-args-${reloadKey}`"
                :editorId="editorId"
                :schemeContainer="schemeContainer"
                :argsDefinition="template.args"
                :args="args"
                @argument-changed="onArgChanged"
            /> -->
            <ArgumentsEditor v-if="ungroupedArgs"
                :key="`item-${item.id}-template-ungrouped-args-${reloadKey}`"
                :editorId="editorId"
                :schemeContainer="schemeContainer"
                :argsDefinition="ungroupedArgs"
                :args="args"
                @argument-changed="onArgChanged"
            />

            <Panel :key="`template-arg-group-${group.name}`" v-for="group in argGroups" :name="group.name" :uid="`template-arg-group-${group.name}`">
                <ArgumentsEditor
                    :key="`item-${item.id}-template-group-${group.name}-${reloadKey}`"
                    :editorId="editorId"
                    :schemeContainer="schemeContainer"
                    :argsDefinition="group.args"
                    :args="args"
                    @argument-changed="onArgChanged"
                />
            </Panel>

            <Panel :key="`editor-panel-${panel.id}`" v-for="panel in editorPanels" :name="panel.name" :uid="panel.id">
                <ul v-if="panel.type === 'item-menu'" class="template-editor-panel-items-container">
                    <li v-for="item in panel.items" @click="onEditorPanelItemClicked(panel, item)"
                        :style="{width: `${panel.slotSize.width}px`, height: `${panel.slotSize.height}px`, }"
                        :title="item.name"
                        >
                        <svg :width="`${panel.slotSize.width}px`" :height="`${panel.slotSize.height}px`">
                            <g transform="translate(4, 4)">
                                <ItemSvg :editorId="editorId" :item="item" mode="edit"/>
                            </g>
                            <rect x="0" y="0" :width="`${panel.slotSize.width}px`" :height="`${panel.slotSize.height}px`" fill="rgba(0,0,0,0.0)" stroke="none"/>
                        </svg>
                    </li>
                </ul>
                <ul v-if="panel.type === 'buttons'" class="properties-button-list">
                    <li v-for="button in panel.buttons">
                        <span class="btn btn-secondary" @click="onEditorPanelItemClicked(panel, button)">{{ button.name }}</span>
                    </li>
                </ul>
            </Panel>
        </div>

        <div class="section">
            <span class="btn btn-secondary"
                @click="updateTemplate"
                title="Updates all items with the latest changes in the template"
                >Update template</span>
            <span class="btn btn-danger"
                @click="breakTemplate"
                title="After the template is broken the items will not be regenerated"
                >Break template</span>
        </div>
    </div>
</template>

<script>
import ArgumentsEditor from '../ArgumentsEditor.vue';
import {forEach, forEachObject} from '../../../collections';
import EditorEventBus from '../EditorEventBus';
import ItemSvg from '../items/ItemSvg.vue';
import Panel from '../Panel.vue';
import { createDelayer } from '../../../delayer';

export default {
    props: {
        item: {type: Object},
        templateRef: {type: String},
        schemeContainer: {type: Object},
        editorId: {type: String},
    },

    components: { ArgumentsEditor, ArgumentsEditor, ItemSvg, Panel },

    beforeMount() {
        this.loadTemplate();
        EditorEventBus.item.templateArgsUpdated.specific.$on(this.editorId, this.item.id, this.updateTemplateArgs);
    },

    beforeDestroy() {
        this.updateDelayer.destroy();
        EditorEventBus.item.templateArgsUpdated.specific.$off(this.editorId, this.item.id, this.updateTemplateArgs);
    },

    data() {
        return {
            ungroupedArgs: {},
            argGroups: [],

            isLoading: false,
            reloadKey: 0,
            errorMessage: null,
            templateNotFound: false,
            template: null,
            editorPanels: [],
            lastChangedArgName: null,
            updateDelayer: createDelayer(250, () => {
                this.$emit('updated', this.item.id, this.template, this.args, this.lastChangedArgName);
            }),
            args: this.item.args && this.item.args.templateArgs ? this.item.args.templateArgs : {}
        }
    },

    methods: {
        onEditorPanelItemClicked(panel, panelItem) {
            const templateData = panel.click(panelItem);

            if (this.template.args) {
                for (let key in this.template.args) {
                    if (this.template.args.hasOwnProperty(key)) {
                        this.item.args.templateArgs[key] = templateData[key];
                    }
                }
            }
            this.$emit('template-rebuild-requested', this.item.id, this.template, this.item.args.templateArgs);
            EditorEventBus.schemeChangeCommitted.$emit(this.editorId);
            this.updateTemplateArgs();
        },

        updateTemplateArgs() {
            if (this.item.args && this.item.args.templateArgs) {
                this.args = this.item.args.templateArgs;
                this.reloadKey++;
            }
        },

        loadTemplate() {
            this.templateNotFound = false;
            this.isLoading = true;
            this.schemeContainer.getTemplate(this.templateRef).then(compiledTemplate => {
                this.isLoading = false;
                this.template = compiledTemplate
                if (compiledTemplate.argsDef) {
                    const ungroupedArgs = {};
                    const groupedArgs = new Map();

                    forEach(compiledTemplate.argsDef, (arg, argName) => {
                        if (!this.args.hasOwnProperty(argName)) {
                            this.args[argName] = arg.value;
                        }
                        if (arg.group) {
                            if (groupedArgs.has(arg.group)) {
                                groupedArgs.get(arg.group)[argName] = arg;
                            } else {
                                const obj = {};
                                obj[argName] = arg;
                                groupedArgs.set(arg.group, obj);
                            }
                        } else {
                            ungroupedArgs[argName] = arg;
                        }
                    });
                    this.ungroupedArgs = ungroupedArgs;
                    const argGroups = [];
                    groupedArgs.forEach((args, groupName) => {
                        argGroups.push({
                            name: groupName,
                            args
                        });
                    });
                    this.argGroups = argGroups;
                }
                this.updateEditorPanels();
            }).catch(err => {
                this.isLoading = false;
                console.error(err);
                if (err.response && err.response.status === 404) {
                    this.templateNotFound = true;
                } else {
                    this.errorMessage = 'Something went wrong, could not load template';
                }
            });
        },

        updateEditorPanels() {
            const selectedTemplateItemIds = [];
            forEach(this.schemeContainer.selectedItems, item => {
                if (item.meta.templateRootId === this.item.id) {
                    selectedTemplateItemIds.push(item.args.templatedId);
                }
            });
            const editor = this.template.buildEditor(this.item, this.args, this.item.area.w, this.item.area.h, selectedTemplateItemIds);
            this.editorPanels = editor.panels;
        },

        onArgChanged(name, value) {
            // syncing template args that are saved in the template
            // to make sure that we don't override them
            if (this.item.args && this.item.args.templateArgs) {
                forEachObject(this.item.args.templateArgs, (existingValue, existingName) => {
                    if (name !== existingName) {
                        this.args[existingName] = existingValue;
                    }
                });
            }
            this.args[name] = value;
            this.lastChangedArgName = name;
            this.updateDelayer.trigger();
            this.updateEditorPanels();
            this.$forceUpdate();
        },

        breakTemplate() {
            this.$emit('break-template', this.item);
        },

        updateTemplate() {
            this.$emit('update-template', this.item.id, this.template, this.args);
        }
    },

    computed: {
        apiClient() {
            return this.$store.getters.apiClient;
        }
    }
}

</script>