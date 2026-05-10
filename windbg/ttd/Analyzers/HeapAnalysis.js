
//----------------------------------------------------------------------------
//
// HeapAnalysis.js - Present heap-related call data for the loaded TTD trace
//                   in the debugger data model.
//
// Copyright (C) Microsoft Corporation. All rights reserved.
//
//----------------------------------------------------------------------------

"use strict";

class ttdData
{
    // Return call information for all heap operations that can create/move/destroy memory
    // By default Heap() [or Heap(true)] filters out internal calls as they are generally not interesting to client code. 
    // To see all the allocations, such as LFH blocks which are subdivided before being returned to clients, call Heap(false).

    get [Symbol.metadataDescriptor]()
    {
        return {
            Heap : { PreferShow : true, Help : "Returns normalized heap information from the time travel trace (such as memory allocation, reallocation or frees)" }
        }
    }

    Heap(ignoreInternalAllocations)
    {

        var HEAP_NO_SERIALIZE           = 0x00000001;
        var HEAP_GENERATE_EXCEPTIONS    = 0x00000004;
        var HEAP_ZERO_MEMORY            = 0x00000008;
        var HEAP_REALLOC_IN_PLACE_ONLY  = 0x00000010;
        var HEAP_CREATE_ENABLE_EXECUTE  = 0x00040000;

        var PUBLIC_HEAP_FLAGS =
            HEAP_NO_SERIALIZE
            | HEAP_GENERATE_EXCEPTIONS
            | HEAP_ZERO_MEMORY
            | HEAP_REALLOC_IN_PLACE_ONLY
            | HEAP_CREATE_ENABLE_EXECUTE
            ;
        var PRIVATE_HEAP_FLAGS = ~PUBLIC_HEAP_FLAGS;

        var exemptedFlagMask = (ignoreInternalAllocations === false) ? 0 : PRIVATE_HEAP_FLAGS;

        var heapCalls = this.capturedSession().TTD.Calls(
            "ntdll!RtlAllocateHeap",
            "ntdll!RtlCreateHeap",
            "ntdll!RtlDestroyHeap",
            "ntdll!RtlFreeHeap",
            "ntdll!RtlLockHeap",
            "ntdll!RtlProtectHeap",
            "ntdll!RtlReAllocateHeap",
            "ntdll!RtlUnlockHeap"
            );

        return heapCalls.Select(function(c)
            {
                switch (c.Function)
                {

                    // PVOID RtlAllocateHeap ( __in PVOID HeapHandle, __in_opt ULONG Flags, __in SIZE_T Size )
                    case "ntdll!RtlAllocateHeap":
                        return {
                            "Action"     : "Alloc",
                            "Heap"       : c.RawParameters[0],
                            "Address"    : c.RawReturnValue,
                            "Size"       : c.RawParameters[2],
                            "Flags"      : c.RawParameters[1],
                            "TimeStart"  : c.TimeStart,
                            "TimeEnd"    : c.TimeEnd
                        };

                    // PVOID RtlReAllocateHeap ( __in PVOID HeapHandle, __in ULONG Flags, __in PVOID BaseAddress, __in SIZE_T Size )
                    case "ntdll!RtlReAllocateHeap":
                        return {
                            "Action"            : "ReAlloc",
                            "Heap"              : c.RawParameters[0],
                            "Address"           : c.RawReturnValue,
                            "PreviousAddress"   : c.RawParameters[2],
                            "Size"              : c.RawParameters[3],
                            "Flags"             : c.RawParameters[1],
                            "TimeStart"         : c.TimeStart,
                            "TimeEnd"           : c.TimeEnd
                        };

                    // LOGICAL RtlFreeHeap ( __in PVOID HeapHandle, __in_opt ULONG Flags, __in __post_invalid  PVOID BaseAddress )
                    case "ntdll!RtlFreeHeap":
                        return {
                            "Action"     : "Free",
                            "Heap"       : c.RawParameters[0],
                            "Address"    : c.RawParameters[2],
                            "Flags"      : c.RawParameters[1],
                            "Result"     : c.RawReturnValue,
                            "TimeStart"  : c.TimeStart,
                            "TimeEnd"    : c.TimeEnd
                        };

                    // PVOID RtlCreateHeap ( __in ULONG Flags, __in_opt PVOID HeapBase, __in_opt SIZE_T ReserveSize, __in_opt SIZE_T CommitSize # not recorded yet (> 4 parameters): , __in_opt PVOID Lock, __in_opt PRTL_HEAP_PARAMETERS Parameters )
                    case "ntdll!RtlCreateHeap":
                        return {
                            "Action"     : "Create",
                            "Heap"       : c.RawReturnValue,
                            "BaseAddress": c.RawParameters[1],
                            "Flags"      : c.RawParameters[0],
                            "ReserveSize": c.RawParameters[2],
                            "CommitSize" : c.RawParameters[3],
                            "TimeStart"  : c.TimeStart,
                            "TimeEnd"    : c.TimeEnd
                        };

                    // VOID NTAPI RtlProtectHeap ( _In_ PVOID HeapHandle, _In_ BOOLEAN MakeReadOnly );
                    case "ntdll!RtlProtectHeap":
                        return {
                            "Action"        : "Protect",
                            "Heap"          : c.RawParameters[0],
                            "MakeReadOnly"  : c.RawParameters[1],
                            "TimeStart"     : c.TimeStart,
                            "TimeEnd"       : c.TimeEnd
                        };

                    // BOOLEAN RtlLockHeap ( _In_ PVOID HeapHandle )
                    case "ntdll!RtlLockHeap":
                        return {
                            "Action"     : "Lock",
                            "Heap"       : c.RawParameters[0],
                            "Result"     : c.RawReturnValue,
                            "TimeStart"  : c.TimeStart,
                            "TimeEnd"    : c.TimeEnd
                        };

                    // BOOLEAN RtlUnlockHeap ( _In_ PVOID HeapHandle )
                    case "ntdll!RtlUnlockHeap":
                        return {
                            "Action"     : "Unlock",
                            "Heap"       : c.RawParameters[0],
                            "Result"     : c.RawReturnValue,
                            "TimeStart"  : c.TimeStart,
                            "TimeEnd"    : c.TimeEnd
                        };

                    // PVOID RtlDestroyHeap ( __in __post_invalid PVOID HeapHandle )
                    case "ntdll!RtlDestroyHeap":
                        return {
                            "Action"     : "Destroy",
                            "Heap"       : c.RawParameters[0],
                            "Result"     : c.RawReturnValue,
                            "TimeStart"  : c.TimeStart,
                            "TimeEnd"    : c.TimeEnd
                        };

                    default:
                        return c;
                }
            }).Where(function(c)
            {
                return (c.Flags === undefined) || ((c.Flags.convertToNumber() & exemptedFlagMask) == 0);                
            });
    }
}

class ttdUtility
{
    get [Symbol.metadataDescriptor]()
    {
        return {
            GetHeapAddress : { PreferShow : true, Help : "Returns all the heap operations that impact the specified address" }
        }
    }

    // Return all the create/move/destroy heap operations that impact specified address
    GetHeapAddress(address)
    {
        return this.capturedSession().TTD.Data.Heap().Where(function(c)
        {
            // compare address to range (free blocks do not have a size so make min size of 1)
            return address >= c.Address && address < (c.Address + (c.Size ? c.Size : 1));
        });
    }
}


function initializeScript()
{
    return [
        new host.apiVersionSupport(1, 2),
        new host.namedModelParent     (ttdData, "TTDAnalyze.Data"),
        new host.namedModelParent  (ttdUtility, "TTDAnalyze.Utility"),
    ];
}

