<#
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
#>

param(
    [Parameter(Mandatory=$true, Position=0, ValueFromPipelineByPropertyName=$true)]
    [string] $ID <# package.appxmanifest//Identity@name #>
)

$code = @"
using System;
using System.Runtime.InteropServices;
namespace PackageDebug
{
    public enum PACKAGE_EXECUTION_STATE
    {
        PES_UNKNOWN,
        PES_RUNNING,
        PES_SUSPENDING,
        PES_SUSPENDED,
        PES_TERMINATED
    }

    [ComImport, Guid("B1AEC16F-2383-4852-B0E9-8F0B1DC66B4D")]
    public class PackageDebugSettings
    {
    }

    [ComImport, Guid("F27C3930-8029-4AD1-94E3-3DBA417810C1"),InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    public interface IPackageDebugSettings
    {
        int EnableDebugging([MarshalAs(UnmanagedType.LPWStr)] string packageFullName, [MarshalAs(UnmanagedType.LPWStr)] string debuggerCommandLine, IntPtr environment);
        int DisableDebugging([MarshalAs(UnmanagedType.LPWStr)] string packageFullName);
        int Suspend([MarshalAs(UnmanagedType.LPWStr)] string packageFullName);
        int Resume([MarshalAs(UnmanagedType.LPWStr)] string packageFullName);
        int TerminateAllProcesses([MarshalAs(UnmanagedType.LPWStr)] string packageFullName);
        int SetTargetSessionId(int sessionId);
        int EnumerageBackgroundTasks([MarshalAs(UnmanagedType.LPWStr)] string packageFullName,
                                                      out uint taskCount, out int intPtr, [Out] string[] array);
        int ActivateBackgroundTask(IntPtr something);
        int StartServicing([MarshalAs(UnmanagedType.LPWStr)] string packageFullName);
        int StopServicing([MarshalAs(UnmanagedType.LPWStr)] string packageFullName);
        int StartSessionRedirection([MarshalAs(UnmanagedType.LPWStr)] string packageFullName, uint sessionId);
        int StopSessionRedirection([MarshalAs(UnmanagedType.LPWStr)] string packageFullName);
        int GetPackageExecutionState([MarshalAs(UnmanagedType.LPWStr)] string packageFullName,
                                            out PACKAGE_EXECUTION_STATE packageExecutionState);
        int RegisterForPackageStateChanges([MarshalAs(UnmanagedType.LPWStr)] string packageFullName,
                               IntPtr pPackageExecutionStateChangeNotification, out uint pdwCookie);
        int UnregisterForPackageStateChanges(uint dwCookie);
    }

    public class DebugTool
    {
        public static void EnableDebug(String packageFullName)
        {
            // Set debug mode for App and activate installed application
            var debugSettings = (IPackageDebugSettings)(new PackageDebugSettings());
            debugSettings.EnableDebugging(packageFullName, null, (IntPtr)null);
        }
    }
}
"@

Add-Type -TypeDefinition $code

$packageFullName = $(Get-AppxPackage $ID).PackageFullName
Write-Host "Setting debug mode for application:" $ID
[PackageDebug.DebugTool]::EnableDebug($packageFullName) | Out-Null
