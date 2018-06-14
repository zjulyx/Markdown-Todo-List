<template>
    <div>
        <el-tabs v-model="CurTab" type="card" editable @edit="handleTabsEdit" @click.middle.native="handleTabsEdit(CurTab, 'remove')">
            <el-alert title="Click + to open or create todo list file" type="info" :closable="false" show-icon center v-if="ShowNoTabHelp"> </el-alert>
            <el-tab-pane :key="index" v-for="(item,index) in TabsData" :label="item.FileName" :name="index.toString()" v-else>
                <el-input v-model="item.Content.Title" class="el-title" :size="ItemSize">
                </el-input>

                <el-date-picker v-model="item.CurDate" align="center" type="date" placeholder="Choose Date" :picker-options="pickerOptions" value-format="yyyy-MM-dd" :size="ItemSize" style="width:100%">
                </el-date-picker>

                <el-input clearable prefix-icon="el-icon-search" placeholder="Todo Filter..." :size="ItemSize" v-model="FilterText" v-if="showFilterBar(item)">
                </el-input>
                <el-tree :data="item.Content[item.CurDate]" ref="tree" show-checkbox node-key="id" default-expand-all :expand-on-click-node="false" @check-change="handleCheckChange" :filter-node-method="filterNode" :style="TreeStyle" draggable @node-drag-start="handleDragStart" @node-drop="handleDrop">
                    <span slot-scope="{ node, data }" style="width:100%; display: -webkit-flex; display:flex; justify-content:space-between; overflow:'auto'">
                        <el-input :value="node.label" @change="val=>doneEdit(val, node, data)" :size="ItemSize" :style="`width:${inputWidth(node)}px`" class="el-todo-item">
                        </el-input>
                        <el-tooltip :content="showProgress(data.progress)" placement="top" effect="light">
                            <el-rate :size="ItemSize" v-model="data.progress" :max="MAXPROGRESS" @change="val=>{updateProgress(val,node)}" :disabled="!node.isLeaf" disabled-void-color="#C6D1DE" disabled-void-icon-class="el-icon-star-off" :style="`margin-top:5px;width:${RateWidth}px`"></el-rate>
                        </el-tooltip>
                        <el-button-group :style="`width:${ButtonWidth}px`">
                            <el-button type="success" icon="el-icon-circle-plus-outline" @click="() => addTodo({node:node})" size="mini" plain circle></el-button>
                            <el-button type="danger" icon="el-icon-delete" @click="() => removeTodo(node, data)" size="mini" plain circle></el-button>
                        </el-button-group>
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
import axios from 'axios'

import * as constants from "../../model/constants";
import * as fileOperation from "../../utils/fileOperation";
import * as markdownParser from "../../utils/markdownParser";
import * as util from "../../utils/util";
import * as vux from "../store/vuxOperation";
import * as packageConfig from "../../../package.json";

import { ipcRenderer, remote } from 'electron'
import { exec } from 'child_process'

let initSharedData = JSON.parse(JSON.stringify(remote.getGlobal('sharedData')))

let TodoList = {
    name: "todo-list",
    data() {
        return {
            TabsData: initSharedData.TabsData,
            Files: initSharedData.Files,
            MAXPROGRESS: constants.MAXPROGRESS,
            FilterDate: true,
            LeavedNode: null,
            ItemSize: 'small',
            NewTodoIdMap: {},
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
        ButtonWidth() {
            return 60;
        },
        RateWidth() {
            return 90;
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
        }
    },
    mounted() {
        this.updateCheckStatusAtFirst(this.CurDate)
        this.checkVersion()
        SaveUserDataFile()
    },
    methods: {
        checkVersion() {
            let curVersion = packageConfig.version
            let versionAPIUri = `https://api.github.com/repos/zjulyx/Markdown-Todo-List/releases/latest`
            let lastestVersionUri = "https://github.com/zjulyx/Markdown-Todo-List/releases/latest"
            axios.get(versionAPIUri)
                .then((response) => {
                    let serverVersion = response.data.tag_name.substr(1); // remove prefix 'v'
                    if (serverVersion > curVersion) {
                        this.$notify({
                            title: 'Update Available',
                            dangerouslyUseHTMLString: true,
                            message: `Find new version ${serverVersion}, click <a href="#">here</a> to download`,
                            duration: 0,
                            onClick() {
                                // may need use different cmd in different os
                                exec(`start ${lastestVersionUri}`)
                            }
                        });
                    }
                })
                .catch((error) => {
                    this.$message({
                        showClose: true,
                        duration: 0,
                        message: `Find error ${error} when checking version`,
                        type: 'warning'
                    });
                });
        },
        inputWidth(node) {
            // checkbox width is 18px, expand symbol witdth is 24px
            let inputWidth = this.FullWidth - this.ButtonWidth - this.RateWidth - node.level * 18 - 24 - 55
            return inputWidth
        },
        handleDragStart(node, ev) {
            this.LeavedNode = node.parent
        },
        handleDrop(draggingNode, dropNode, dropType, ev) {
            let prevprogress = draggingNode.data.progress
            this.$nextTick(function () {
                // drop process may clear data's progress
                this.updateProgress(prevprogress, draggingNode)
                this.updateProgress(CalNodeProgress(dropNode), dropNode)
                if (this.LeavedNode) {
                    this.updateProgress(CalNodeProgress(this.LeavedNode), this.LeavedNode)
                }
                this.updateCheckStatusAtFirst(this.CurDate)
            })
        },
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
                this.TabsData.splice(parseInt(targetName), 1)
                this.Files.splice(parseInt(targetName), 1)
                if (this.CurTab >= this.TabsData.length - 1) {
                    SetCurTab((this.TabsData.length - 1).toString())
                }
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
            if (parent) {
                this.updateProgress(CalNodeProgress(parent), parent)
            } else {
                SaveMarkdownFile()
            }
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

ipcRenderer.on(constants.FileOpenedChannel, (evt, Files) => {
    let tempTabsData = TodoList.data().TabsData
    let tempFiles = TodoList.data().Files
    let originLength = tempTabsData.length
    let originFileLength = tempFiles.length
    let count = 0
    Files = FilterDuplicateFiles(tempFiles, Files, (newCurTab) => {
        SetCurTab(newCurTab)
    })
    let handleResult = function (file, index) {
        return function (res, cancelled) {
            if (!cancelled) {
                tempTabsData[index + originLength] = util.GenerateNewTabData(file, res)
                tempFiles[index + originFileLength] = file
            }
            if (++count === Files.length) {
                tempTabsData = util.RemoveNullElementFromArray(tempTabsData)
                tempFiles = util.RemoveNullElementFromArray(tempFiles)
                SetCurTab((tempTabsData.length - 1).toString())
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
.el-title input.el-input__inner {
  border: 0;
  text-align: center;
  font-size: 18px;
  letter-spacing: 0.04em;
  display: inline-block;
  font-weight: bold;
  color: orange;
  text-shadow: 0 0 1px currentColor, -1px -1px 1px #000, 0 -1px 1px #000,
    1px -1px 1px #000, 1px 0 1px #000, 1px 1px 1px #000, 0 1px 1px #000,
    -1px 1px 1px #000, -1px 0 1px #000;
  -webkit-filter: url(#el-title);
  filter: url(#el-title);
}

.el-todo-item input.el-input__inner {
  border-top: 0;
  border-right: 0;
  border-left: 0;
  border-bottom: 1px ridge white;
  border-radius: 0;
  height: 80%;
  margin-top: 3px;
  outline: 0;
}
</style>
