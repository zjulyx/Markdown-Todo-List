<template>
    <div>
        <el-tabs v-model="curTab" type="card" editable @edit="handleTabsEdit">
            <el-tab-pane :key="index" v-for="(item,index) in tabs" :label="item.FileName" :name="index.toString()">
                <!-- <el-container>
                    <el-main style="width: 100%"> -->
                <el-tag type="danger" hit @dblclick.native="handleTitleEdit" v-if="titleNotEditing">
                    <i class="el-icon-tickets"></i>
                    {{item.Content.title}} (Double click to edit)
                </el-tag>
                <el-input prefix-icon="el-icon-edit" :value="item.Content.title" @blur="event=>titleEdited(event.target.value)" v-else>
                </el-input>
                <el-input clearable prefix-icon="el-icon-search" placeholder="Todo filter..." size="mini" v-model="filterText" v-if="item.Content[curDate]!==[]">
                </el-input>
                <el-tree :data="item.Content[curDate]" ref="tree" show-checkbox node-key="id" default-expand-all :expand-on-click-node="false" @check-change="handleCheckChange" :filter-node-method="filterNode" style="width: 100%">
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
import * as constants from "../../model/constants";
import * as fileOperation from "../../utils/fileOperation";
import * as markdownParser from "../../utils/markdownParser";
import * as util from "../../utils/util";
import * as vux from "../store/vuxOperation";

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
            MAXPROGRESS: constants.MAXPROGRESS,
            Content: constants.Content,
            FileName: constants.FileName,
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
                            this.tabs[this.curTab][constants.Content][today] = this.tabs[this.curTab][constants.Content][this.curDate]
                            this.SaveCurrentFile()
                        }
                        picker.$emit('pick', date);
                    }
                }]
            }
        };
    },
    computed: {
        filterText: vux.GenerateComputed(constants.FilterText),
        tabs: vux.GenerateComputed(constants.TabsData, this.SaveCurrentFile),
        curTab: vux.GenerateComputed(constants.CurTab),
        newTodo: vux.GenerateComputed(constants.NewTodo),
        titleNotEditing: vux.GenerateComputed(constants.TitleNotEditing),
        curDate: vux.GenerateComputed(constants.CurDate),
        files: vux.GenerateComputed(constants.Files)
    },
    watch: {
        filterText(val) {
            this.$refs.tree[this.curTab].filter(val);
        },
        curDate: {
            handler: function (newCurDate) {
                // first make sure tree is loaded
                if (!(newCurDate in this.tabs[this.curTab][constants.Content])) {
                    this.tabs[this.curTab][constants.Content][newCurDate] = []
                    this.$nextTick(function () {
                        this.updateCheckStatusAtFirst(newCurDate)
                        this.SaveCurrentFile()
                    })
                }
            }
        }
    },
    mounted() {
        this.$nextTick(function () {
            id = markdownParser.curId
            this.updateCheckStatusAtFirst(this.curDate)
        });
    },
    methods: {
        SaveCurrentFile() {
            fileOperation.SaveMarkdownFile(this.tabs[this.curTab][constants.FileName], this.tabs[this.curTab][constants.Content])
            fileOperation.SaveUserDataFile(constants.UserDataFile, {
                [constants.Files]: this.files,
                [constants.CurTab]: this.curTab
            })
        },
        handleTitleEdit() {
            this.titleNotEditing = false
        },
        titleEdited(newTitle) {
            this.titleNotEditing = true
            this.tabs[this.curTab][constants.Content].title = newTitle
            this.SaveCurrentFile()
        },
        handleTabsEdit(targetName, action) {
            if (action === 'add') {
                this.tabs.push({
                    [constants.FileName]: 'New Todo File',
                    [constants.Content]: { title: 'New Todo' }
                });
                this.curTab = (this.tabs.length - 1).toString();
            }
            if (action === 'remove') {
                this.tabs.splice(parseInt(targetName), 1)
                if (this.curTab >= this.tabs.length - 1) {
                    this.curTab = (this.tabs.length - 1).toString();
                }
            }
        },
        filterNode(value, data) {
            if (!value) return true;
            return data.label.indexOf(value) !== -1;
        },
        updateCheckStatusAtFirst(thisDate) {
            if (thisDate in this.tabs[this.curTab][constants.Content]) {
                for (let rootData of this.tabs[this.curTab][constants.Content][thisDate]) {
                    updateCheckStatus(this.$refs.tree[this.curTab].getNode(rootData))
                }
            } else {
                this.tabs[this.curTab][constants.Content][thisDate] = []
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
                this.SaveCurrentFile()
                return
            }

            this.updateProgress(calNodeProgress(parent), parent)
        },
        showProgress(val) {
            return util.ConvertProgressToDisplay(val)
        },
        addTodo({ newTodo = 'new todo...', node = this.$refs.tree[this.curTab].root }) {
            const newChild = { id: id++, label: newTodo, progress: 0, finished: false, children: [] };
            if (!(this.curDate in this.tabs[this.curTab][constants.Content])) {
                this.tabs[this.curTab][constants.Content][this.curDate] = []
            }
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
            this.SaveCurrentFile()
        }
    }
};
</script>

<style>
.el-margin-bottom {
  margin-bottom: 10px;
}
</style>
