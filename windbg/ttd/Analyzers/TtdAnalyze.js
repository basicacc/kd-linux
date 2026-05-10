
//-------------------------------------------------------------------------------------------------------------
//
// TtdAnalyzer.js - "Base class" for TTDAnalyze extensions to the debugger data model.
//
// Copyright (C) Microsoft Corporation. All rights reserved.
//-------------------------------------------------------------------------------------------------------------

"use strict";

class ttdData
{
    constructor(session)
    {
        // Hold on to the session that the object is created with and use that in subsequent queries
        this.__session = session;
    }

    // Make the captured session object available to extensions
    capturedSession()
    {
        return this.__session;
    }

    toString()
    {
        return "Normalized data sources based on the contents of the time travel trace";
    }
}

class ttdUtility
{
    constructor(session)
    {
        // Hold on to the session that the object is created with and use that in subsequent queries
        this.__session = session;
    }

    // Make the captured session object available to extensions
    capturedSession()
    {
        return this.__session;
    }

    // Comparison function for time positions
    // usage:
    //   Debugger:      dx -g @$calls.OrderBy(x => x.TimeStart, @$cursession.TTD.Utility.compareTime)
    //   JavaScript:    var calls = host.currentSession.TTD.Calls("ucrtbase!initterm").OrderBy(
    //                                function (c) { return c.TimeStart; },
    //                                host.currentSession.TTD.Utility.compareTime
    //                                );
    compareTime(t1, t2)
    {
        return t1.compareTo(t2);
    }

    toString()
    {
        return "Methods that can be useful when analyzing time travel traces";
    }
}


var ttdExtension =
{
    get Data()      { return new ttdData     (this); },
    get Utility()   { return new ttdUtility  (this); },
}

function initializeScript()
{
    return [
        new host.apiVersionSupport(1, 2),
        new host.namedModelParent      (ttdExtension,   "TTDAnalyze"),
        new host.namedModelRegistration(ttdData,        "TTDAnalyze.Data"),
        new host.namedModelRegistration(ttdUtility,     "TTDAnalyze.Utility"),
    ];
}
