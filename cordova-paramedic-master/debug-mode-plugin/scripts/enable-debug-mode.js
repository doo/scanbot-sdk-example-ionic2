/**
    Licensed to the Apache Software Foundation (ASF) under one
    or more contributor license agreements.  See the NOTICE file
    distributed with this work for additional information
    regarding copyright ownership.  The ASF licenses this file
    to you under the Apache License, Version 2.0 (the
    "License"); you may not use this file except in compliance
    with the License.  You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing,
    software distributed under the License is distributed on an
    "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
    KIND, either express or implied.  See the License for the
    specific language governing permissions and limitations
    under the License.
*/

module.exports = function (context) {
    const path = require('path');
    const shell = require('shelljs');

    const libPath = path.resolve(context.opts.projectRoot, 'platforms', 'windows', 'cordova', 'lib');
    const appUtilsPath = path.join(libPath, 'WindowsStoreAppUtils.ps1');
    const appUtilsBackupPath = path.join(libPath, 'WindowsStoreAppUtils.ps1.bak');
    const srcScriptPath = path.join(__dirname, 'EnableDebuggingForPackage.ps1');
    const destScriptPath = path.join(libPath, 'EnableDebuggingForPackage.ps1');

    // copy over the patch
    shell.cp('-f', srcScriptPath, libPath);
    shell.cp('-f', appUtilsPath, appUtilsBackupPath);

    // add extra code to patch
    shell.sed(
        '-i',
        /^\s*\$appActivator .*$/gim,
        '$&\n\n' +
        '    # START ENABLE DEBUG MODE SECTION\n' +
        '    powershell ' + destScriptPath + ' $$ID\n' +
        '    $Ole32 = Add-Type -MemberDefinition "[DllImport(\'Ole32.dll\')]public static extern int CoAllowSetForegroundWindow(IntPtr pUnk, IntPtr lpvReserved);" -Name "Ole32" -Namespace "Win32" -PassThru\n' +
        '    $Ole32::CoAllowSetForegroundWindow([System.Runtime.InteropServices.Marshal]::GetIUnknownForObject($appActivator), [System.IntPtr]::Zero)\n' +
        '    # END ENABLE DEBUG MODE SECTION\n',
        appUtilsPath
    );
};
