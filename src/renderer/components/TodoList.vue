<template>
    <div>
        <el-tabs v-model="CurTab" type="card" editable @edit="handleTabsEdit">
            <el-tab-pane :key="index" v-for="(item,index) in TabsData" :label="item.FileName" :name="index.toString()">
                <el-tag type="danger" hit @dblclick.native="handleTitleEdit" v-if="TitleNotEditing">
                    <i class="el-icon-tickets"></i>
                    {{item.Content.Title}} (Double click to edit)
                </el-tag>
                <el-input prefix-icon="el-icon-edit" :value="item.Content.Title" @blur="event=>titleEdited(event.target.value)" @change="val=>titleEdited(val)" v-else>
                </el-input>
                <el-input clearable prefix-icon="el-icon-search" placeholder="Todo filter..." size="mini" v-model="FilterText" v-if="item.Content[CurDate]!==[]">
                </el-input>
                <el-tree :data="item.Content[CurDate]" ref="tree" show-checkbox node-key="id" default-expand-all :expand-on-click-node="false" @check-change="handleCheckChange" :filter-node-method="filterNode" style="width: 100%">
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
                <el-date-picker v-model="CurDate" align="right" type="date" placeholder="Choose Date" :picker-options="pickerOptions" value-format="yyyy-MM-dd">
                </el-date-picker>
                <el-input placeholder="Add new Todo" v-model="NewTodo" @keyup.enter.native="addTodo({NewTodo:item.NewTodo})" clearable>
                </el-input>
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

import { ipcRenderer } from 'electron'
import path from 'path'

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
                        if (today !== this.CurDate) {
                            this.TabsData[this.CurTab][constants.Content][today] = this.TabsData[this.CurTab][constants.Content][this.CurDate]
                            this.SaveCurrentFile()
                        }
                        picker.$emit('pick', date);
                    }
                }]
            }
        };
    },
    computed: {
        FilterText: {
            set(newData) {
                this.TabsData[this.CurTab][constants.FilterText] = newData
                vux.SetVuxData(this.TabsData, constants.TabsData)
            },
            get() {
                let curData = this.TabsData[this.CurTab][constants.FilterText]
                if (this.$refs.tree && this.$refs.tree[this.CurTab]) {
                    this.$refs.tree[this.CurTab].filter(curData);
                }
                return curData;
            }
        },
        NewTodo: {
            set(newData) {
                this.TabsData[this.CurTab][constants.NewTodo] = newData
                vux.SetVuxData(this.TabsData, constants.TabsData)
            },
            get() {
                return this.TabsData[this.CurTab][constants.NewTodo];
            }
        },
        CurDate: {
            set(newData) {
                this.TabsData[this.CurTab][constants.CurDate] = newData
                if (!(newData in this.TabsData[this.CurTab][constants.Content])) {
                    this.TabsData[this.CurTab][constants.Content][newData] = []
                    this.$nextTick(function () {
                        this.updateCheckStatusAtFirst(newData)
                        this.SaveCurrentFile()
                    })
                }
                vux.SetVuxData(this.TabsData, constants.TabsData)
            },
            get() {
                return this.TabsData[this.CurTab][constants.CurDate];
            }
        },
        TabsData: vux.GenerateComputed(constants.TabsData, this.SaveCurrentFile),
        CurTab: vux.GenerateComputed(constants.CurTab),
        TitleNotEditing: vux.GenerateComputed(constants.TitleNotEditing),
        Files: vux.GenerateComputed(constants.Files)
    },
    mounted() {
        this.$nextTick(function () {
            id = markdownParser.curId
            this.updateCheckStatusAtFirst(this.CurDate)
        });
    },
    methods: {
        SaveCurrentFile() {
            fileOperation.SaveMarkdownFile(this.TabsData[this.CurTab][constants.FileName], this.TabsData[this.CurTab][constants.Content])
            fileOperation.SaveUserDataFile(constants.UserDataFile, {
                [constants.Files]: this.Files,
                [constants.CurTab]: this.CurTab
            })
        },
        handleTitleEdit() {
            this.TitleNotEditing = false
        },
        titleEdited(newTitle) {
            this.TitleNotEditing = true
            this.TabsData[this.CurTab][constants.Content][constants.Title] = newTitle
            this.SaveCurrentFile()
        },
        handleTabsEdit(targetName, action) {
            if (action === 'add') {
                ipcRenderer.send(constants.FileSaveChannel)
            }
            if (action === 'remove') {
                this.TabsData.splice(parseInt(targetName), 1)
                this.Files.splice(parseInt(targetName), 1)
                if (this.CurTab >= this.TabsData.length - 1) {
                    this.CurTab = (this.TabsData.length - 1).toString();
                }
            }
        },
        filterNode(value, data) {
            if (!value) return true;
            return data.label.indexOf(value) !== -1;
        },
        updateCheckStatusAtFirst(thisDate) {
            if (thisDate in this.TabsData[this.CurTab][constants.Content]) {
                for (let rootData of this.TabsData[this.CurTab][constants.Content][thisDate]) {
                    updateCheckStatus(this.$refs.tree[this.CurTab].getNode(rootData))
                }
            } else {
                this.TabsData[this.CurTab][constants.Content][thisDate] = []
            }
        },
        handleCheckChange(data, checked, subchecked) {
            let node = this.$refs.tree[this.CurTab].getNode(data)
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
        generateInitData(label) {
            return { id: id++, label: label, progress: 0, finished: false, children: [] }
        },
        updateProgress(newProgress, node) {
            let parent = node.parent
            if (!parent) {
                // root node, have no progress/finished prop
                this.SaveCurrentFile()
                return
            }

            node.data = node.data
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
            this.updateProgress(calNodeProgress(parent), parent)
        },
        showProgress(val) {
            return util.ConvertProgressToDisplay(val)
        },
        addTodo({ NewTodo = 'new todo...', node = this.$refs.tree[this.CurTab].root }) {
            const newChild = this.generateInitData(NewTodo)
            if (!(this.CurDate in this.TabsData[this.CurTab][constants.Content])) {
                this.TabsData[this.CurTab][constants.Content][this.CurDate] = []
            }
            this.$refs.tree[this.CurTab].append(newChild, node)
            this.updateProgress(calNodeProgress(node), node)
        },
        removeTodo(node, data) {
            let parent = node.parent;
            this.$refs.tree[this.CurTab].remove(node)
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

ipcRenderer.on(constants.FileOpenedChannel, (evt, Files) => {
    let tabsData = vux.GetVuxData(constants.TabsData)
    let storedFiles = vux.GetVuxData(constants.Files)
    let originLength = tabsData.length
    let originFileLength = storedFiles.length
    let count = 0
    Files.forEach((file, index) => {
        fileOperation.LoadMarkdownFile(file, res => {
            tabsData[index + originLength] = {
                [constants.Content]: res,
                [constants.FileName]: file
            }
            storedFiles[index + originFileLength] = file

            if (++count === Files.length) {
                let CurTab = (originLength + Files.length - 1).toString()
                vux.SetVuxData(CurTab, constants.CurTab)
                vux.SetVuxData(tabsData, constants.TabsData)
                vux.SetVuxData(storedFiles, constants.Files)
            }
        })
    })
})

ipcRenderer.on(constants.FileSavedChannel, (evt, filename) => {
    let tabsData = vux.GetVuxData(constants.TabsData)
    let storedFiles = vux.GetVuxData(constants.Files)
    let initObj = { [constants.Title]: path.basename(filename, path.extname(filename)) }
    let initData = util.GenerateNewTabData(filename, initObj)
    fileOperation.SaveMarkdownFile(filename, initObj, () => {
        let fileIndex = storedFiles.indexOf(filename)
        if (fileIndex === -1) {
            fileIndex = tabsData.length
        }
        storedFiles[fileIndex] = filename
        tabsData[fileIndex] = initData
        vux.SetVuxData(fileIndex.toString(), constants.CurTab)
        vux.SetVuxData(tabsData, constants.TabsData)
        vux.SetVuxData(storedFiles, constants.Files)
    })
})
</script>

<style>
.el-margin-bottom {
  margin-bottom: 10px;
}
</style>
