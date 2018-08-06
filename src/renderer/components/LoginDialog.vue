<template>
    <el-dialog title="Sign in Github" :visible.sync="dialogFormVisible">
        <el-alert title="Incorrect username or password" type="error" :closable="false" show-icon v-if="showAlert">
        </el-alert>
        <el-form :model="form" label-position="top">
            <el-form-item label="Username or email address" :label-width="formLabelWidth">
                <el-input v-model="form.account" auto-complete="off"></el-input>
            </el-form-item>
            <el-form-item label="Password" :label-width="formLabelWidth">
                <el-input type="password" v-model="form.password" auto-complete="off"></el-input>
            </el-form-item>
        </el-form>
        <div slot="footer" class="dialog-footer">
            <el-button type="primary" @click="submitForm">Sign in</el-button>
            <el-button @click="dialogFormVisible = false">Cancel</el-button>
        </div>
    </el-dialog>
</template>

<script>
import axios from 'axios'

import * as vux from "../store/vuxOperation";
import * as constants from "../../model/constants";
import * as dataOperation from "../../utils/dataOperation";

export default {
    name: "todo-list",
    data() {
        return {
            form: {
                account: '',
                password: ''
            },
            formLabelWidth: '120px',
            showAlert: false
        }
    },
    computed: {
        dialogFormVisible: {
            get() {
                return vux.GetVuxData(constants.LoginDialogVisible)
            },
            set(flag) {
                vux.SetVuxData(flag, constants.LoginDialogVisible)
            }
        }
    },
    methods: {
        submitForm() {
            // check whether login ok
            const creds = Buffer.from(`${this.form.account}:${this.form.password}`, 'utf8').toString('base64')
            const authorization = `Basic ${creds}`
            const ClientID = process.env.MARKDOWNTODOLIST_OAUTH_CLIENT_ID
            const ClientSecret = process.env.MARKDOWNTODOLIST_OAUTH_CLIENT_SECRET
            console.log(process.env)
            axios.post(`https://api.github.com/authorizations`,
                {
                    client_secret: ClientSecret,
                    client_id: ClientID,
                    scopes: ['gist'],
                    note: 'Synchronizing data by Markdown Todolist'
                },
                {
                    headers: {
                        Authorization: authorization
                    }
                }).then((response) => {
                    console.log(response);
                    vux.SetVuxData(response.data.token, constants.AccessToken)
                    dataOperation.SaveUserDataFile()
                    dataOperation.downloadGist()
                    this.dialogFormVisible = false
                }).catch((error) => {
                    this.showAlert = true
                    console.log(error);
                });
        }
    }
};
</script>

<style>
</style>
