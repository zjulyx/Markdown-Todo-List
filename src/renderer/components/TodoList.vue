<template>
    <div>
        <el-tabs v-model="CurTab" type="card" editable @edit="handleTabsEdit" @click.middle.native="handleTabsEdit(CurTab, 'remove')">
            <el-alert title="Click + to open or create todo list file" type="info" :closable="false" show-icon center v-if="ShowNoTabHelp"> </el-alert>
            <el-tab-pane :key="index" v-for="(item,index) in TabsData" :label="item.FileName" :name="index.toString()" v-else>
                <el-tooltip content="Double click to edit title" placement="right" effect="light" v-if="item.TitleNotEditing">
                    <el-alert :title="item.Content.Title" type="warning" :closable="false" @dblclick.native.prevent="handleTitleEdit" center> </el-alert>
                </el-tooltip>
                <el-input ref="titleEdit" prefix-icon="el-icon-edit" :value="item.Content.Title" @blur="event=>titleEdited(event.target.value)" @change="val=>titleEdited(val)" @dblclick.native.prevent="handleTitleEdit" :size="ItemSize" v-else>
                </el-input>

                <el-date-picker v-model="item.CurDate" align="center" type="date" placeholder="Choose Date" :picker-options="pickerOptions" value-format="yyyy-MM-dd" :size="ItemSize" style="width:100%">
                </el-date-picker>

                <el-input clearable prefix-icon="el-icon-search" placeholder="Todo Filter..." :size="ItemSize" v-model="FilterText" v-if="showFilterBar(item)">
                </el-input>
                <el-tree :data="item.Content[item.CurDate]" ref="tree" show-checkbox node-key="id" default-expand-all :expand-on-click-node="false" @check-change="handleCheckChange" :filter-node-method="filterNode" :style="TreeStyle">
                    <span slot-scope="{ node, data }">
                        <el-input :value="node.label" @change="val=>doneEdit(val, node, data)" :size="ItemSize">
                            <el-container slot="append">
                                <el-tooltip :content="showProgress(data.progress)" placement="right" effect="light">
                                    <el-rate :size="ItemSize" v-model="data.progress" :max="MAXPROGRESS" @change="val=>{updateProgress(val,node)}" :disabled="!node.isLeaf" disabled-void-color="#C6D1DE" disabled-void-icon-class="el-icon-star-off"></el-rate>
                                </el-tooltip>
                            </el-container>
                        </el-input>
                        <span>
                            <el-button type="primary" icon="el-icon-circle-plus-outline" @click="() => addTodo({node:node})" :size="ItemSize"></el-button>
                            <el-button type="danger" icon="el-icon-delete" @click="() => removeTodo(node, data)" :size="ItemSize"></el-button>
                            <el-button type="success" icon="el-icon-caret-top" @click="() => moveTodo(node, MoveDirection.Up)" :disabled="isFirstChild(node)" :size="ItemSize"></el-button>
                            <el-button type="success" icon="el-icon-caret-bottom" @click="() => moveTodo(node, MoveDirection.Down)" :disabled="isLastChild(node)" :size="ItemSize"></el-button>
                        </span>
                    </span>
                </el-tree>
                <el-input placeholder="Add New Todo..." v-model="item.NewTodo" @keyup.enter.native="addTodo({NewTodo : item.NewTodo})" clearable :size="ItemSize">
                </el-input>
            </el-tab-pane>
        </el-tabs>
    </div>
</template>

<script>
import Vue from 'vue'
import fs from 'fs'

import * as constants from "../../model/constants";
import * as fileOperation from "../../utils/fileOperation";
import * as markdownParser from "../../utils/markdownParser";
import * as util from "../../utils/util";
import * as vux from "../store/vuxOperation";

import { ipcRenderer, remote } from 'electron'

let initSharedData = JSON.parse(JSON.stringify(remote.getGlobal('sharedData')))

let TodoList = {
    name: "todo-list",
    data() {
        return {
            TabsData: initSharedData.TabsData,
            Files: initSharedData.Files,
            MAXPROGRESS: constants.MAXPROGRESS,
            FilterDate: true,
            ItemSize: 'mini',
            NewTodoIdMap: {},
            FileWatchers: [],
            MoveDirection: {
                'Up': 'Up',
                'Down': 'Down'
            },
            pickerOptions: {
                disabledDate: time => {
                    let now = Date.now()
                    let disabled = time.getTime() > now
                    if (GetOnlyShowContentDate() && this.CurTabData) {
                        let formatedTime = util.FormatDateTime(time)
                        let today = util.FormatDateTime(now)
                        disabled = disabled || !(formatedTime in this.CurTabContent) || this.CurTabContent[formatedTime].length === 0
                        // today will always be available
                        disabled = disabled && formatedTime !== today
                    }

                    return disabled
                },
                firstDayOfWeek: 1,
                shortcuts: [
                    {
                        text: 'Today',
                        onClick(picker) {
                            picker.$emit('pick', new Date());
                        }
                    },
                    {
                        text: 'Yesterday',
                        onClick(picker) {
                            const date = new Date();
                            date.setTime(date.getTime() - 3600 * 1000 * 24);
                            picker.$emit('pick', date);
                        }
                    },
                    {
                        text: 'A Week Ago',
                        onClick(picker) {
                            const date = new Date();
                            date.setTime(date.getTime() - 3600 * 1000 * 24 * 7);
                            picker.$emit('pick', date);
                        }
                    },
                    {
                        text: 'Copy To Today',
                        onClick: picker => {
                            const date = new Date();
                            let today = util.FormatDateTime(date)
                            if (today !== this.CurDate) {
                                let copiedContent = JSON.parse(JSON.stringify(this.CurTabContent[this.CurDate]))
                                Vue.set(this.CurTabContent, today, copiedContent)
                                SaveMarkdownFile()
                            }
                            picker.$emit('pick', date);
                        }
                    }]
            }
        };
    },
    computed: {
        FullHeight() {
            return vux.GetVuxData(constants.FullHeight);
        },
        FullWidth() {
            return vux.GetVuxData(constants.FullWidth);
        },
        TreeStyle() {
            // other components height is 200
            return {
                width: '100%',
                height: `${this.FullHeight - 200}px`,
                overflow: 'auto'
            }
        },
        ShowNoTabHelp() {
            return this.CurTab < 0 || this.CurTab >= this.TabsData.length
        },
        CurTabData() {
            return this.TabsData[this.CurTab]
        },
        CurTabContent() {
            return this.CurTabData.Content
        },
        CurDate() {
            let curTabData = this.CurTabData
            return curTabData ? curTabData.CurDate : null
        },
        CurTab: {
            set(newData) {
                SetCurTab(newData)
                this.updateCheckStatusAtFirst(this.CurDate)
                // Add watcher for new opended tab
                Vue.set(this.TabsData, newData, this.TabsData[newData])
                Vue.set(this.Files, newData, this.Files[newData])
            },
            get() {
                return GetCurTab();
            }
        },
        FilterText: {
            set(newData) {
                this.CurTabData.FilterText = newData
            },
            get() {
                let curData = this.CurTabData.FilterText
                if (this.$refs.tree && this.$refs.tree[this.CurTab]) {
                    this.$refs.tree[this.CurTab].filter(curData);
                }
                return curData;
            }
        }
    },
    watch: {
        CurDate(newData) {
            this.updateCheckStatusAtFirst(newData)
        },
        TabsData: {
            handler: function () {
                this.updateCheckStatusAtFirst(this.CurDate)
            },
            deep: true
        }
    },
    mounted() {
        this.updateCheckStatusAtFirst(this.CurDate)
        SaveUserDataFile()
        this.$nextTick(function () {
            console.log(this.Files)
            this.Files.forEach((file, index) => {
                AddWatcher(file, index)
                console.log(this.FileWatchers)
            })
        })
    },
    methods: {
        increaseNewTodoId() {
            let CurFileName = this.Files[this.CurTab]
            if (!(CurFileName in this.NewTodoIdMap)) {
                this.NewTodoIdMap[CurFileName] = {}
            }

            if (!(this.CurDate in this.NewTodoIdMap[CurFileName])) {
                this.NewTodoIdMap[CurFileName][this.CurDate] = 0
            }

            return this.NewTodoIdMap[CurFileName][this.CurDate]++
        },
        showFilterBar(item) {
            return !item.Content[item.CurDate] || item.Content[item.CurDate].length !== 0
        },
        isFirstChild(node) {
            return node === node.parent.childNodes[0]
        },
        isLastChild(node) {
            return node === node.parent.childNodes[node.parent.childNodes.length - 1]
        },
        handleTitleEdit() {
            this.CurTabData.TitleNotEditing = false
        },
        titleEdited(newTitle) {
            this.CurTabData.TitleNotEditing = true
            this.CurTabContent.Title = newTitle
            SaveMarkdownFile()
        },
        handleTabsEdit(targetName, action) {
            if (action === 'add') {
                ipcRenderer.send(constants.FileOpenChannel)
            }
            if (action === 'remove') {
                console.log(this.TabsData)
                console.log(this.CurTab)
                let removedIndex = parseInt(targetName)
                console.log(removedIndex)
                this.TabsData.splice(removedIndex, 1)
                this.Files.splice(removedIndex, 1)
                fileOperation.RemoveFileWatcher(removedIndex, this.FileWatchers)
                if (this.CurTab >= this.TabsData.length - 1) {
                    SetCurTab((this.TabsData.length - 1).toString())
                }
                console.log(this.CurTab)
                SaveUserDataFile()
            }
        },
        filterNode(value, data) {
            if (!value) return true;
            return data.label.toLowerCase().indexOf(value.toLowerCase()) !== -1;
        },
        updateCheckStatusAtFirst(thisDate) {
            if (!thisDate) {
                return
            }

            if (thisDate in this.CurTabContent) {
                for (let rootData of this.CurTabContent[thisDate]) {
                    this.$nextTick(function () {
                        UpdateCheckStatus(this.$refs.tree[this.CurTab].getNode(rootData))
                    })
                }
            } else {
                Vue.set(this.CurTabContent, thisDate, [])
                SaveMarkdownFile()
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
        updateProgress(newProgress, node) {
            let parent = node.parent
            if (!parent) {
                // root node, have no progress/finished prop
                SaveMarkdownFile()
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
            this.updateProgress(CalNodeProgress(parent), parent)
        },
        showProgress(val) {
            return util.ConvertProgressToDisplay(val)
        },
        addTodo({ NewTodo, node = this.$refs.tree[this.CurTab].root }) {
            NewTodo = NewTodo || `New Todo ${this.increaseNewTodoId()}`
            const newChild = GenerateInitData(NewTodo)
            if (!(this.CurDate in this.CurTabContent)) {
                Vue.set(this.CurTabContent, this.CurDate, [])
            }
            this.$refs.tree[this.CurTab].append(newChild, node)
            this.updateProgress(CalNodeProgress(node), node)
        },
        moveTodo(node, moveDirection) {
            let parent = node.parent
            let curIndex = parent.childNodes.indexOf(node)
            let originData = node.data
            let action
            if (moveDirection === this.MoveDirection.Up) {
                if (curIndex <= 0) {
                    return
                }
                curIndex--
                action = this.$refs.tree[this.CurTab].insertBefore
            } else {
                if (curIndex === -1 || curIndex === parent.childNodes.length - 1) {
                    return
                }
                curIndex++
                action = this.$refs.tree[this.CurTab].insertAfter
            }
            let siblingNode = parent.childNodes[curIndex]
            this.$refs.tree[this.CurTab].remove(node)
            action(originData, siblingNode)
            SaveMarkdownFile()
        },
        removeTodo(node, data) {
            let parent = node.parent;
            this.$refs.tree[this.CurTab].remove(node)
            this.updateProgress(CalNodeProgress(parent), parent)
        },
        doneEdit: function (newval, node, data) {
            if (!newval) {
                this.removeTodo(node)
                return
            }
            newval = newval.trim()
            data.label = newval
            SaveMarkdownFile()
        }
    }
};

export default TodoList;

function GenerateInitData(label) {
    return { id: markdownParser.IncreaseCurId(), label: label, progress: 0, finished: false, children: [] }
}

function CalNodeProgress(node) {
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

function UpdateCheckStatus(node) {
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
        UpdateCheckStatus(child)
    }
}

function SaveMarkdownFile() {
    let curTab = GetCurTab()
    let tabsData = TodoList.data().TabsData
    let filename = tabsData[curTab].FileName
    let content = tabsData[curTab].Content
    fileOperation.SaveMarkdownFile(filename, content)
}

function SaveUserDataFile() {
    let files = TodoList.data().Files
    let curTab = GetCurTab()
    let onlyShowContentDate = GetOnlyShowContentDate()
    fileOperation.SaveUserDataFile(constants.UserDataFile, {
        Files: files,
        CurTab: curTab,
        OnlyShowContentDate: onlyShowContentDate
    })
}

function GetCurTab() {
    return vux.GetVuxData(constants.CurTab)
}

function SetCurTab(newData) {
    vux.SetVuxData(newData, constants.CurTab)
    SaveUserDataFile()
}

function GetOnlyShowContentDate() {
    return vux.GetVuxData(constants.OnlyShowContentDate)
}

function SetOnlyShowContentDate(newData) {
    vux.SetVuxData(newData, constants.OnlyShowContentDate)
    SaveUserDataFile()
}

function FilterDuplicateFiles(currentFiles, newFiles, findDupCallback) {
    let res = []
    newFiles.forEach(item => {
        let curIndex = currentFiles.indexOf(item)
        if (curIndex === -1) {
            res.push(item)
        } else {
            findDupCallback(curIndex.toString())
        }
    })
    return res
}

function AddWatcher(file, index) {
    console.log(file)
    let currentFileWatchers = TodoList.data().FileWatchers
    let currentTabsData = TodoList.data().TabsData
    let currentFiles = TodoList.data().Files
    let handleResult = function (res, cancelled) {
        if (!cancelled) {
            // because id not equal, so regard as different...
            if (JSON.stringify(currentTabsData[index].Content) !== JSON.stringify(res)) {
                console.log(currentTabsData[index].Content)
                console.log(res)
                // currentTabsData[index].Content = res
            } else {
                console.log('equal')
            }
        }
    }

    currentFileWatchers[index] = fs.watch(file, evt => {
        if (evt === 'change') {
            fileOperation.LoadMarkdownFile(file, handleResult)
        } else if (evt === 'rename') {
            currentFiles.splice(index, 1)
            currentTabsData.splice(index, 1)
            fileOperation.RemoveFileWatcher(index, currentFileWatchers)
        }
    })

    // fileOperation.AddFileWatcher(file, index, currentFileWatchers, (evt, fileName) => {
    //     if (evt === 'change') {
    //         fileOperation.LoadMarkdownFile(file, handleResult(file, index))
    //     } else if (evt === 'rename') {
    //         currentFiles.splice(index, 1)
    //         currentTabsData.splice(index, 1)
    //         fileOperation.RemoveFileWatcher(index, currentFileWatchers)
    //     }
    // })
}

ipcRenderer.on(constants.FileOpenedChannel, (evt, Files) => {
    let currentTabsData = TodoList.data().TabsData
    let currentFiles = TodoList.data().Files
    let originLength = currentTabsData.length
    let originFileLength = currentFiles.length
    let count = 0
    Files = FilterDuplicateFiles(currentFiles, Files, (newCurTab) => {
        SetCurTab(newCurTab)
    })
    let handleResult = function (file, index) {
        return function (res, cancelled) {
            if (!cancelled) {
                currentTabsData[index + originLength] = util.GenerateNewTabData(file, res)
                currentFiles[index + originFileLength] = file
                AddWatcher(file, index + originLength)
            }
            if (++count === Files.length) {
                currentTabsData = util.RemoveNullElementFromArray(currentTabsData)
                currentFiles = util.RemoveNullElementFromArray(currentFiles)
                SetCurTab((currentTabsData.length - 1).toString())
            }
        }
    }
    Files.forEach((file, index) => {
        fileOperation.LoadMarkdownFile(file, handleResult(file, index))
    })
})

ipcRenderer.on(constants.ToggleSwitchChannel, (evt, menuItem) => {
    SetOnlyShowContentDate(menuItem.checked)
})

remote.getCurrentWindow().on('resize', _ => {
    vux.SetVuxData(util.GetCurrentFullHeight(), constants.FullHeight)
    vux.SetVuxData(util.GetCurrentFullWidth(), constants.FullWidth)
})
</script>

<style>
.el-margin-bottom {
  margin-bottom: 10px;
}
</style>
