<template>
    <div>
        <el-tabs v-model="curTab" type="card" editable @edit="handleTabsEdit">
            <el-tab-pane :key="index" v-for="(item,index) in tabs" :label="item.fileName" :name="index.toString()">
                <!-- <el-container>
                    <el-main style="width: 100%"> -->
                <el-tag type="danger" hit @dblclick.native="handleTitleEdit" v-if="titleNotEditing">
                    <i class="el-icon-tickets"></i>
                    {{item.content.title}} (Double click to edit)
                </el-tag>
                <el-input prefix-icon="el-icon-edit" :value="item.content.title" @change="val=>titleEdited(val)" v-else>
                </el-input>
                <el-input clearable prefix-icon="el-icon-search" placeholder="Todo filter..." size="mini" v-model="filterText" v-if="item.content[curDate]!==[]">
                </el-input>
                <el-tree :data="item.content[curDate]" ref="tree" show-checkbox node-key="id" default-expand-all :expand-on-click-node="false" @check-change="handleCheckChange" :filter-node-method="filterNode" style="width: 100%">
                    <span slot-scope="{ node, data }">
                        <el-input :value="node.label" @change="val=>doneEdit(val, node, data)" size="mini">
                            <el-container slot="append">
                                <el-tooltip :content="showProgress(data.progress)" placement="top">
                                    <el-rate size="mini" v-model="data.progress" :max="MAXPROGRESS" @change="val=>{updateProgress(val,node)}" :disabled="!node.isLeaf" disabled-void-color="#C6D1DE" disabled-void-icon-class="el-icon-star-off"></el-rate>
                                </el-tooltip>
                            </el-container>
                        </el-input>
                        <span>
                            <el-button type="primary" icon="el-icon-circle-plus" @click="() => addTodo({node:node})" size="mini"></el-button>
                            <el-button type="danger" icon="el-icon-delete" @click="() => removeTodo(node, data)" size="mini"></el-button>
                        </span>
                    </span>
                </el-tree>
                <el-date-picker v-model="curDate" align="right" type="date" placeholder="Choose Date" :picker-options="pickerOptions" value-format="yyyy-MM-dd">
                </el-date-picker>
                <el-input placeholder="Add new Todo" v-model="newTodo" @keyup.enter.native="addTodo({newTodo:newTodo})" clearable>
                </el-input>
                <!-- </el-footer>
                </el-container> -->
            </el-tab-pane>
        </el-tabs>
    </div>
</template>

<script>
import * as constants from "../../utils/constants";
import * as markdownParser from "../../utils/markdownParser";
import * as util from "../../utils/util";
import { setImmediate } from 'timers';

let id

let calNodeProgress = function (node) {
    let childCount = node.childNodes.length
    if (childCount === 0) {
        return node.data.progress
    }
    let progressSum = 0
    for (let child of node.childNodes) {
        progressSum += child.data.progress
    }
    return progressSum / childCount
}

let updateCheckStatus = function (node) {
    if (!node) {
        return
    }

    if (node.data.progress === constants.MAXPROGRESS) {
        node.checked = true
        node.indeterminate = false
    } else if (node.data.progress !== 0) {
        node.indeterminate = true
    }
    for (let child of node.childNodes) {
        updateCheckStatus(child)
    }
}

export default {
    name: "todo-list",
    data() {
        return {
            filterText: '',
            tabs: [],
            curTab: '0',
            newTodo: '',
            titleNotEditing: true,
            curDate: util.FormatDateTime(new Date()),
            MAXPROGRESS: constants.MAXPROGRESS,
            pickerOptions: {
                disabledDate: time => {
                    return time.getTime() > Date.now();
                },
                shortcuts: [{
                    text: 'Today',
                    onClick(picker) {
                        picker.$emit('pick', new Date());
                    }
                }, {
                    text: 'Yesterday',
                    onClick(picker) {
                        const date = new Date();
                        date.setTime(date.getTime() - 3600 * 1000 * 24);
                        picker.$emit('pick', date);
                    }
                }, {
                    text: 'A Week Ago',
                    onClick(picker) {
                        const date = new Date();
                        date.setTime(date.getTime() - 3600 * 1000 * 24 * 7);
                        picker.$emit('pick', date);
                    }
                }, {
                    text: 'Copy To Today',
                    onClick: picker => {
                        const date = new Date();
                        let today = util.FormatDateTime(date)
                        if (today !== this.curDate) {
                            this.tabs[this.curTab].content[today] = this.tabs[this.curTab].content[this.curDate]
                            markdownParser.SaveMarkdownFile('test.md', this.tabs[this.curTab].content)
                        }
                        picker.$emit('pick', date);
                    }
                }]
            }
        };
    },
    watch: {
        filterText(val) {
            this.$refs.tree[this.curTab].filter(val);
        },
        // tabs: {
        //     handler(newVal) {
        //         this.updateCheckStatusAtFirst(this.curDate)
        //     },
        //     deep: true
        // },
        curDate: {
            handler: function (newCurDate) {
                // first make sure tree is loaded
                if (!(newCurDate in this.tabs[this.curTab].content)) {
                    this.tabs[this.curTab].content[newCurDate] = []
                    this.$nextTick(function () {
                        this.updateCheckStatusAtFirst(newCurDate)
                        markdownParser.SaveMarkdownFile('test.md', this.tabs[this.curTab].content)
                    })
                }
            }
        }
    },
    // computed: {
    //     wholeData() {
    //         return this.tabs[this.curTab].content
    //     }
    // },
    mounted() {
        this.$nextTick(function () {
            // this.tabs[this.curTab].content = {}
            markdownParser.LoadMarkdownFile('test.md', res => {
                console.log('mounted')
                console.log(this.curTab)
                this.tabs.push({ content: res })
                console.log(this.tabs)
                id = markdownParser.curId
                if (!(this.curDate in this.tabs[this.curTab].content)) {
                    this.tabs[this.curTab].content[this.curDate] = []
                }
                this.tabs[this.curTab].fileName = 'test.md'
                setImmediate(this.updateCheckStatusAtFirst, this.curDate)
            })
        });
    },
    methods: {
        SaveCurrentFile() {
            console.log('Save')
        },
        handleTitleEdit() {
            console.log('handleTitleEdit')
            this.titleNotEditing = false
        },
        titleEdited(newTitle) {
            this.titleNotEditing = true
            this.tabs[this.curTab].content.title = newTitle
            markdownParser.SaveMarkdownFile('test.md', this.tabs[this.curTab].content)
        },
        handleTabsEdit(targetName, action) {
            if (action === 'add') {
                this.tabs.push({
                    fileName: 'New Todo File',
                    content: { title: 'New Todo' }
                });
                this.curTab = (this.tabs.length - 1).toString();
            }
            if (action === 'remove') {
                console.log(targetName)
                console.log(this.curTab)
                this.tabs.splice(parseInt(targetName), 1)
                if (this.curTab >= this.tabs.length - 1) {
                    this.curTab = (this.tabs.length - 1).toString();
                }
                console.log(this.tabs)
                console.log(targetName)
                // this.editableTabs = tabs.filter(tab => tab.name !== targetName);
            }
        },
        filterNode(value, data) {
            if (!value) return true;
            return data.label.indexOf(value) !== -1;
        },
        updateCheckStatusAtFirst(thisDate) {
            console.log(this.$refs)
            if (thisDate in this.tabs[this.curTab].content) {
                for (let rootData of this.tabs[this.curTab].content[thisDate]) {
                    updateCheckStatus(this.$refs.tree[this.curTab].getNode(rootData))
                }
            } else {
                this.tabs[this.curTab].content[thisDate] = []
            }
        },
        handleCheckChange(data, checked, subchecked) {
            let node = this.$refs.tree[this.curTab].getNode(data)
            let originProgress = data.progress
            if (checked) {
                data.progress = constants.MAXPROGRESS
            } else if (!node.indeterminate) {
                data.progress = 0
            }
            if (originProgress !== data.progress) {
                this.updateProgress(data.progress, node)
            }
        },
        updateProgress(newProgress, node) {
            node.data.progress = newProgress
            node.data.finished = (newProgress === constants.MAXPROGRESS)
            if (newProgress === constants.MAXPROGRESS) {
                node.checked = true
                node.indeterminate = false
            } else if (newProgress === 0) {
                node.checked = false
                node.indeterminate = false
            } else {
                node.indeterminate = true
            }
            let parent = node.parent
            if (!parent) {
                markdownParser.SaveMarkdownFile('test.md', this.tabs[this.curTab].content)
                return
            }

            this.updateProgress(calNodeProgress(parent), parent)
        },
        showProgress(val) {
            return util.ConvertProgressToDisplay(val)
        },
        addTodo({ newTodo = 'new todo...', node = this.$refs.tree[this.curTab].root }) {
            const newChild = { id: id++, label: newTodo, progress: 0, finished: false, children: [] };
            if (!(this.curDate in this.tabs[this.curTab].content)) {
                this.tabs[this.curTab].content[this.curDate] = []
            }
            console.log(this.$refs.tree[this.curTab][this.curTab])
            this.$refs.tree[this.curTab].append(newChild, node)
            this.updateProgress(calNodeProgress(node), node)
        },
        removeTodo(node, data) {
            let parent = node.parent;
            this.$refs.tree[this.curTab].remove(node)
            this.updateProgress(calNodeProgress(parent), parent)
        },
        doneEdit: function (newval, node, data) {
            if (!newval) {
                this.removeTodo(node)
            }
            newval = newval.trim()
            data.label = newval
            markdownParser.SaveMarkdownFile('test.md', this.tabs[this.curTab].content)
        }
    }
};
</script>

<style>
.el-margin-bottom {
  margin-bottom: 10px;
}
</style>
