"use strict";

//**************************************************************************
// This is part of the extensibility for the Windows Kernel Debugger Extension
// (kdexts)
//

class __ProcessesExtension
{
    get spannableGraphNodes()
    {
        var nodes = [];
        for (var process of this)
        {
            nodes.push(process);
        }
        return new host.metadata.valueWithMetadata(nodes, { PreferredGraphForm: 2 });
    }
}

class __ProcessExtension
{
    get graphNodeId()
    {
        return this.Id;
    }

    get graphNodeDescription()
    {
        return "[" + this.Id.toString(16) + "] " + this.Name;
    }

    get graphNodeObject()
    {
        return this;
    }

    get graphNodeEdges()
    {
        //
        // @TODO: This is less than ideal.  We only have child->parent links, so find all of them!
        //
        var edges = [];
        for (var process of this.__processList)
        {
            if (process.KernelObject.InheritedFromUniqueProcessId.address == this.Id)
            {
                edges.push({ graphEdgeSource: this, graphEdgeTarget: process, graphEdgeDescription: "Child", graphEdgeIsDirectional: true });
            }
        }
        return edges;
    }

    get __processList()
    {
        var ctx = this.hostContext;
        return host.namespace.Debugger.Sessions.getValueAt(ctx).Processes;
    }
}

class __DeviceNodeExtension
{
    get graphNodeId()
    {
        return this.DeviceNodeObject.address;
    }

    get graphNodeDescription()
    {
        var str = this.InstancePath;
        if (this.ServiceName)
        {
            str += "\n" + this.ServiceName;
        }
        str += "\n" + this.PhysicalDeviceObject.Driver.dereference().toString();
        for (var udo of this.PhysicalDeviceObject.UpperDevices)
        {
            str += "\n" + udo.Driver.dereference().toString();
        }

        return str;
    }

    get graphNodeObject()
    {
        return this;
    }

    get graphNodeEdges()
    {
        var edges = [];
        for (var child of this.Children)
        {
            edges.push({ graphEdgeSource: this, graphEdgeTarget: child, graphEdgeDescription: "Child", graphEdgeIsDirectional: true});
        }
        return edges;
    }
}

class __DeviceTreeExtension
{
    get spannableGraphNodes()
    {
        var nodes = [];
        for (var child of this)
        {
            nodes.push(child);
        }
        return new host.metadata.valueWithMetadata(nodes, { PreferredGraphForm: 2 });
    }
}

function initializeScript()
{
    return [new host.apiVersionSupport(1, 9),
            new host.namedModelParent(__DeviceTreeExtension, "Debugger.Models.Session.Devices.PnPDevices.DeviceTree"),
            new host.namedModelParent(__DeviceNodeExtension, "Debugger.Models.Session.Devices.PnPDevices.DeviceNode"),
            new host.namedModelParent(__ProcessesExtension, "Debugger.Models.Processes"),
            new host.namedModelParent(__ProcessExtension, "Debugger.Models.Process")];
}
