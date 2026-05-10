"use strict";

delete Object.prototype.toString;

class __FrameSplit
{
    constructor(frameStr, thread, parent, index)
    {
        this.__frameStr = frameStr;
        this.__parent = parent;
        this.__childFrames = { };
        this.__index = index;
        if (thread)
        {
            this.__threads = [thread];
            this.__tids = [thread.Id];
        }
        else
        {
            this.__threads = [];
            this.__tids = [];
        }
        this.__childFrCount = 0;
    }

    __addThread(thread)
    {
        this.__threads.push(thread);
        this.__tids.push(thread.Id);
    }

    __getChild(frameStr, thread)
    {
        if (this.__childFrames[frameStr] === undefined)
        {
            var newChild = new __FrameSplit(frameStr, thread, this);
            this.__childFrames[frameStr] = newChild;
            this.__childFrCount++;
            return newChild;
        }
        var existingChild = this.__childFrames[frameStr];
        existingChild.__addThread(thread);
        return existingChild;
    }

    get __childFrameCount()
    {
        return this.__childFrCount;
    }

    get __onlyChild()
    {
        if (this.__childFrCount != 1)
        {
            return null;
        }
        var keys = Object.getOwnPropertyNames(this.__childFrames);
        for (var key of keys)
        {
            return this.__childFrames[key];
        }
    }

    *__getChildFrames()
    {
        var keys = Object.getOwnPropertyNames(this.__childFrames);
        for (var key of keys)
        {
            yield this.__childFrames[key];
        }
    }

    get __allChildFrames()
    {
        return this.__getChildFrames();
    }
}

function __makeSwitchThunk(thread)
{
    return function()
    {
        thread.SwitchTo();
    }
}

class __ThreadFrameCollection
{
    constructor(threads, frameStr, idx)
    {
        this.__threads = threads;
        this.__frameStr = frameStr;
        this.__idx = idx;
    }

    toString()
    {
        return this.__frameStr;
    }

    getDimensionality()
    {
        return 1;
    }

    getValueAt(tid)
    {
        for (var thread of this.__threads)
        {
            if (thread.Id == tid)
            {
                var frameCount = thread.Stack.Frames.Count();
                var idx = (frameCount - 1) - this.__idx;
                return thread.Stack.Frames.getValueAt(idx);
            }
        }
        return null;
    }

    *[Symbol.iterator]()
    {
        // host.diagnostics.debugLog("thread count = " + this.__threads.length.toString() + " idx = " + this.__idx + "\n");
        for (var thread of this.__threads)
        {
            var frameCount = thread.Stack.Frames.Count();
            var idx = (frameCount - 1) - this.__idx;

            // host.diagnostics.debugLog("thread id = " + thread.Id.toString() + ", __idx = " + this.__idx.toString() + ", idx = " + idx.toString() + "\n");
            yield new host.indexedValue(thread.Stack.Frames.getValueAt(idx), [thread.Id]);
        }
    }
}

class __ThreadFrameSegmentCollection
{
    constructor(threads, baseIndex, count)
    {
        this.__threads = threads;
        this.__baseIndex = baseIndex;
        this.__count = count;
    }

    *[Symbol.iterator]()
    {
        //
        // Remember here since we are forking from the base of the stack, index 0 is there.  We really need to invert
        // the indicies and then walk backwards towards zero.
        //
        var frames = this.__threads[0].Stack.Frames;
        var frameCount = frames.Count();
        var revIdx = this.__baseIndex + (this.__count - 1);
        // host.diagnostics.debugLog("frameCount = " + frameCount.toString() + ", base = " + this.__baseIndex.toString() + ", count = " + this.__count.toString() + "\n");
        var curIdx = (frameCount - 1) - this.__baseIndex - (this.__count - 1);
        if (curIdx >= 0)
        {
            var count = this.__count;
            while (curIdx < frameCount && count > 0)
            {
                var frame = frames.getValueAt(curIdx);
                var frameStr = frame.toString();
                // host.diagnostics.debugLog("frameStr = " + frameStr + "\n");
                yield new __ThreadFrameCollection(this.__threads, frameStr, revIdx);
                ++curIdx;
                --count;
                --revIdx;
            }
        }       
    }
}

class __FilteredFrameSegment
{
    constructor(frameSegment)
    {
        this.__frameSegment = frameSegment;
        this.__metadataDescriptor = {};
    }

    toString()
    {
        return this.__frameSegment.toString();
    }

    *[Symbol.iterator]()
    {
        yield* this.__frameSegment.ThreadStackSegments;
    }
    
    get [Symbol.metadataDescriptor]()
    {
        return this.__metadataDescriptor;
    }    
}

class __FrameSegment
{
    toString()
    {
        var str = this.__frameSplit.__tids.length.toString() + " thread";
        var threadCount = this.__frameSplit.__tids.length;

        if (threadCount == 1)
        {
            str += ": " + this.__frameSplit.__tids[0].toString(16);

            var threadName = this.__frameSplit.__threads[0].Name;
            if (threadName && threadName.length > 0)
            {
                str += " (" + threadName + ")";
            }
        }
        else
        {
            str += "s";
            if (threadCount < 8)
            {
                str += ": ";
                var first = true;
                for (var tid of this.__frameSplit.__tids)
                {
                    if (!first)
                    {
                        str += ", ";
                    }
                    str += tid.toString(16);
                    first = false;
                }
            }
        }
        return str;
    }

    __generateUniqueId()
    {
        //
        // @TODO: We need to be able to generate a unique ID which is reproducable from the same state; otherwise,
        //        actions won't be able to correctly bind at the moment.
        //
        var tid = this.__frameSplit.__tids[0];
        var depth = 1;
        var cur = this.__frameSplit;
        while (cur)
        {
            cur = cur.__parent;
            ++depth;
        }
        return new host.Int64(tid, depth);
    }

    constructor(frameSplit, count, baseIndex)
    {
        this.__frameSplit = frameSplit;
        this.__count = count;
        this.__baseIndex = baseIndex;
        this.__uniqueId = this.__generateUniqueId();
        this.__metadataDescriptor = {};
        this.__filteredFrameSegment = new __FilteredFrameSegment(this);

        //
        // Dynamically patch in functions to switch to each of the threads that the segment owns.
        //
        for (var thread of this.__frameSplit.__threads)
        {
            var acFnName = "SwitchTo" + thread.Id.toString(16);
            var acFn = __makeSwitchThunk(thread);
            var metadataDescriptor = { ActionName: "Switch To Thread " + thread.Id.toString(16), ActionDescription: "Changes the active context to that of thread " + thread.Id.toString(16), ActionIsDefault: false };
            this.__filteredFrameSegment[acFnName] = acFn;
            this.__filteredFrameSegment.__metadataDescriptor[acFnName] = metadataDescriptor;
            this[acFnName] = acFn;
            this.__metadataDescriptor[acFnName] = metadataDescriptor;
        }
    }

    *__getStackText()
    {
        var cur = this.__frameSplit;
        for (var i = 0; i < this.__count; ++i)
        {
            yield cur.__frameStr;
            cur = cur.__parent;
        }
    }

    get StackText()
    {
        return this.__getStackText();
    }

    get ThreadStackSegments()
    {
        return new __ThreadFrameSegmentCollection(this.__frameSplit.__threads, this.__baseIndex, this.__count);
    }

    *[Symbol.iterator]()
    {
        for (var child of this.__frameSplit.__allChildFrames)
        {
            var segmentSize = 1;
            while (child.__childFrameCount == 1)
            {
                child = child.__onlyChild;
                ++segmentSize;
            }

            yield new __FrameSegment(child, segmentSize, this.__baseIndex + this.__count);
        }
    }

    get [Symbol.metadataDescriptor]()
    {
        return this.__metadataDescriptor;
    }

    //*************************************************
    // Graphable Concept:
    //

    get graphNodeDescription()
    {
        var descr = this.toString();
        for (var frame of this.StackText)
        {
            descr += "\n";
            descr += frame;
        }
        return descr;
    }

    get graphNodeId()
    {
        return this.__uniqueId;
    }

    get graphNodeObject()
    {
        // @TODO: This is for the graph view...  need to restructure this script a bit...
        return this.__filteredFrameSegment;
        // return this;
    }

    *__enumEdges()
    {
        for (var childSegment of this)
        {
            var edgeDescr = childSegment.__frameSplit.__tids.length.toString() + " threads";

            yield { graphEdgeSource: this, graphEdgeTarget: childSegment, graphEdgeDescription: edgeDescr, graphEdgeIsDirectional: true };
        }
    }

    get graphNodeEdges()
    {
        return this.__enumEdges();
    }
}

class __GroupedStacks
{
    constructor(process)
    {
        this.__process = process;
    }

    __ensureInitialized()
    {
        if (this.__base === undefined)
        {
            this.__base = new __FrameSplit(null, null, null, -1);

            for (var thread of this.__process.Threads)
            {
                var curSplit = this.__base;
                var tid = thread.Id;
                var frames = [];
                for (var frame of thread.Stack.Frames)
                {
                    frames.push(frame);
                }
                for (var idx = frames.length - 1; idx >= 0; --idx)
                {
                    var examineFrame = frames[idx];
                    curSplit = curSplit.__getChild(examineFrame.toString(), thread);
                }
            }
        }
    }

    *[Symbol.iterator]()
    {
        //
        // Defer the traversal of all thread stacks within this process to the point where someone actually
        // tries to iterate the GroupedStacks object rather than at the point where they acquire it.
        //
        this.__ensureInitialized();

        var segmentSize = 0;
        var cur = this.__base;
        if (cur.__childFrameCount == 1)
        {
            while (cur.__childFrameCount == 1)
            {
                cur = cur.__onlyChild;
                ++segmentSize;
            }

            yield new __FrameSegment(cur, segmentSize, 0);            
        }
        else
        {
            for (var child of cur.__allChildFrames)
            {
                segmentSize = 1;
                while(child.__childFrameCount == 1)
                {
                    child = child.__onlyChild;
                    ++segmentSize;
                }
                
                yield new __FrameSegment(child, segmentSize, 0);
            }
        }
    }

    get spannableGraphNodes()
    {
        return new host.metadata.valueWithMetadata(this, { PreferredGraphForm: 2 });
    }
}

class __ProcessExtension
{
    get GroupedStacks()
    {
        return new __GroupedStacks(this);
    }
}

function initializeScript()
{
    //
    // Return an array of registration objects to modify the object model of the debugger
    // See the following for more details:
    //
    //     https://aka.ms/JsDbgExt
    //
    return [new host.apiVersionSupport(1, 9),
            new host.namedModelParent(__ProcessExtension, "Debugger.Models.Process")];
}
