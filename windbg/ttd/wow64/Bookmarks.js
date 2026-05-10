"use strict";

var __sessionBookmarkDictionary = {};
var __currentUniqueID = 0;

class SessionBookmarks
{
    get Bookmarks()
    {
        var file = this.Attributes.Target.Details.DumpFileName;
        if (!(file in __sessionBookmarkDictionary))
        {
            __sessionBookmarkDictionary[file] = new BookmarkCollection;
        }
        
        return __sessionBookmarkDictionary[file];
    }
}

class Bookmark
{
    constructor(collection, name, category, timestamp)
    {
        if (timestamp.Sequence === undefined || timestamp.Steps === undefined)
        {
            throw "Bookmark must be added at a valid timestamp";
        }
        this.__collection = collection;
        this.__name = name;
        this.__category = category;
        this.__timestamp = timestamp;
        this.UniqueID = __currentUniqueID++;
    }

    get Name()
    {
        return this.__name;
    }

    set Name(value)
    {
        this.__name = value;
    }

    get Timestamp()
    {
        return this.__timestamp;
    }

    set Timestamp(value)
    {
        this.__timestamp = value;
    }

    get Category()
    {
        return this.__category;
    }

    set Category(value)
    {
        this.__category = value;
    }

    Remove()
    {
        this.__collection.__Remove(this);
    }

    toString()
    {
        if (this.Name === undefined)
        {
            return "Bookmark: " + this.__timestamp.toString();
        }
        return "Bookmark: " + this.Name;
    }
}

class BookmarkCollection
{
    constructor()
    {
        this.__bookmarks = [];
    }
    
    AddBookmark(name, category, timestamp)
    {
        if (timestamp === undefined)
        {
            // We could add a bookmark from the wrong session if the current thread doesn't belong to this session.
            // You'd have to jump through hoops to get to there, so I'll leave that as a problem for later
            timestamp = host.currentThread.TTD.Position;
        }
        if (category === undefined)
        {
            category = "bookmark";
        }
        // It's ok for name to be undefined, we'll just use the timestamp for a display string
        this.__bookmarks.push(new Bookmark(this, name, category, timestamp));
    }

    DeleteBookmarkByID(id)
    {
        this.__bookmarks = this.__bookmarks.filter(b => b.UniqueID !== id);
    }

    __Remove(bookmark)
    {
        for( var i = 0; i < this.__bookmarks.length; i++)
        {
            if (this.__bookmarks[i] === bookmark)
            {
                this.__bookmarks.splice(i, 1);
                return;
            }
        }
    }

    *[Symbol.iterator]()
    {
        yield* this.__bookmarks;
    }

    SaveAsJson()
    {
        var serialBookmarks = this.__bookmarks.map(
            x => 
            {
                return {
                    Name: x.Name,
                    Category: x.Category,
                    Sequence: x.Timestamp.Sequence.asNumber(),
                    Steps: x.Timestamp.Steps.asNumber()
                };
            }
        )
        return JSON.stringify(serialBookmarks);
    }

    LoadFromJson(jsonBookmarks)
    {
        var create = host.namespace.Debugger.Utility.Objects.CreateInstance;
        var serialBookmarks = JSON.parse(jsonBookmarks);
        this.__bookmarks = serialBookmarks.map(
            x => new Bookmark(this, x.Name, x.Category, create("Debugger.Models.TTD.Position", x.Sequence, x.Steps))
        )
    }

    toString()
    {
        return "Bookmark collection";
    }
}

function initializeScript()
{
    return [new host.namespacePropertyParent(SessionBookmarks, "Debugger.Models.Session", "TTDAnalyze", "TTD"),
            new host.apiVersionSupport(1, 3)];
}

// SIG // Begin signature block
// SIG // MIIoKAYJKoZIhvcNAQcCoIIoGTCCKBUCAQExDzANBglg
// SIG // hkgBZQMEAgEFADB3BgorBgEEAYI3AgEEoGkwZzAyBgor
// SIG // BgEEAYI3AgEeMCQCAQEEEBDgyQbOONQRoqMAEEvTUJAC
// SIG // AQACAQACAQACAQACAQAwMTANBglghkgBZQMEAgEFAAQg
// SIG // 7aX/GnuE6sGgPGKORLPLKTHYvWdrVZaKCX07IVOuL/ig
// SIG // gg12MIIF9DCCA9ygAwIBAgITMwAABIVemewOWS/N1wAA
// SIG // AAAEhTANBgkqhkiG9w0BAQsFADB+MQswCQYDVQQGEwJV
// SIG // UzETMBEGA1UECBMKV2FzaGluZ3RvbjEQMA4GA1UEBxMH
// SIG // UmVkbW9uZDEeMBwGA1UEChMVTWljcm9zb2Z0IENvcnBv
// SIG // cmF0aW9uMSgwJgYDVQQDEx9NaWNyb3NvZnQgQ29kZSBT
// SIG // aWduaW5nIFBDQSAyMDExMB4XDTI1MDYxOTE4MjEzN1oX
// SIG // DTI2MDYxNzE4MjEzN1owdDELMAkGA1UEBhMCVVMxEzAR
// SIG // BgNVBAgTCldhc2hpbmd0b24xEDAOBgNVBAcTB1JlZG1v
// SIG // bmQxHjAcBgNVBAoTFU1pY3Jvc29mdCBDb3Jwb3JhdGlv
// SIG // bjEeMBwGA1UEAxMVTWljcm9zb2Z0IENvcnBvcmF0aW9u
// SIG // MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA
// SIG // wEpIdXKb7lKn26sXpXuywkhxGplTQXxROLmNRZBrAHVB
// SIG // f7546RNXZwA/bzDqsuWTuPSC4T+I4j/z9j5/WqPuUw7S
// SIG // pnEPqWXc2xu7eN8kVyQt5170xkK6KHT4vVEkIvayPtIM
// SIG // Ll0SgSCOy/pN5DJCi5ha7FlI84F1Qi2GumR+wQgCwHCV
// SIG // mU8Fj6Ik+B6akISXGCwe6X3rQFQngRFWQ/IrSkOkAOfy
// SIG // 0EfvV+nZUo+FcbWuCZ6cb4Eq5I1ws/rZSeuwAWeedZcN
// SIG // t0VlNbsn4AnxBYQX4sj0dlko7JD5fWqeqq3/HzUNbBmL
// SIG // p9qeCXV8XlACn9YVWv900F47z04kVwpyTwIDAQABo4IB
// SIG // czCCAW8wHwYDVR0lBBgwFgYKKwYBBAGCN0wIAQYIKwYB
// SIG // BQUHAwMwHQYDVR0OBBYEFLgmchogri2BNGlO4+UxamNO
// SIG // ZJKNMEUGA1UdEQQ+MDykOjA4MR4wHAYDVQQLExVNaWNy
// SIG // b3NvZnQgQ29ycG9yYXRpb24xFjAUBgNVBAUTDTIzMDAx
// SIG // Mis1MDUzNTkwHwYDVR0jBBgwFoAUSG5k5VAF04KqFzc3
// SIG // IrVtqMp1ApUwVAYDVR0fBE0wSzBJoEegRYZDaHR0cDov
// SIG // L3d3dy5taWNyb3NvZnQuY29tL3BraW9wcy9jcmwvTWlj
// SIG // Q29kU2lnUENBMjAxMV8yMDExLTA3LTA4LmNybDBhBggr
// SIG // BgEFBQcBAQRVMFMwUQYIKwYBBQUHMAKGRWh0dHA6Ly93
// SIG // d3cubWljcm9zb2Z0LmNvbS9wa2lvcHMvY2VydHMvTWlj
// SIG // Q29kU2lnUENBMjAxMV8yMDExLTA3LTA4LmNydDAMBgNV
// SIG // HRMBAf8EAjAAMA0GCSqGSIb3DQEBCwUAA4ICAQAo5qgK
// SIG // dgouLEx2XIvqpLRACrBZORzVRislkdqxRl7He3IIGdOB
// SIG // +VOEldHwC+nzhPXS77eCOxwRy4aRnROVIy8uDcS0xtmw
// SIG // wJHgFZsZndrillRisptWmqw8V379xgjeJkV/j5+HPqct
// SIG // 0v+ipLeXkgwCCLK8ysNyodkltYQsF1/5Nb+G/jR9RY5f
// SIG // ov8TybKVwhbmQeGguRS0+X4G0Sqp7FngHZ/A7K2EIU90
// SIG // Fy7ejb9/3TM7+xvwnaW3XKLpfBWJfrd3ZlzPkiApQt5d
// SIG // mntMDpTa0ONskBMnLj1OTqKi0/OY7Ge/uAmknHxSDZTu
// SIG // 5e2O6/8Wrqh20j0Na96CAvnu9ebNhtwpWWt8vfWmMdpZ
// SIG // 12HtbK3KyMfDQF01YosqV1Z/WRphJHzXHw4qhkMJJpec
// SIG // /Z5t6VogWevWnWgQWwBRI8iRuMtGu+m3pf+LAwlb2mcy
// SIG // zN0xW8VTvQUK42UbWyWW5At1wK6S6mUn8ed0rmHXXcT1
// SIG // /Kb3KhbhLvMHFHg9ObfcTWyeE7XQBAiZRItL7wcZZjOb
// SIG // cxV8tqmXqjzFx0kGKj4GfY70nGejcM5xQ9Pt95G88oTk
// SIG // s/1rhmwLuHB2RvICp5UFU+LgNg4nsfQzLNlh4qJDZJ2J
// SIG // S6FHll1tUKyS6ajvNky8ik2wTP6GRwHSHNJM6Ek66PW9
// SIG // /r459vNPQ9PkjjglWTCCB3owggVioAMCAQICCmEOkNIA
// SIG // AAAAAAMwDQYJKoZIhvcNAQELBQAwgYgxCzAJBgNVBAYT
// SIG // AlVTMRMwEQYDVQQIEwpXYXNoaW5ndG9uMRAwDgYDVQQH
// SIG // EwdSZWRtb25kMR4wHAYDVQQKExVNaWNyb3NvZnQgQ29y
// SIG // cG9yYXRpb24xMjAwBgNVBAMTKU1pY3Jvc29mdCBSb290
// SIG // IENlcnRpZmljYXRlIEF1dGhvcml0eSAyMDExMB4XDTEx
// SIG // MDcwODIwNTkwOVoXDTI2MDcwODIxMDkwOVowfjELMAkG
// SIG // A1UEBhMCVVMxEzARBgNVBAgTCldhc2hpbmd0b24xEDAO
// SIG // BgNVBAcTB1JlZG1vbmQxHjAcBgNVBAoTFU1pY3Jvc29m
// SIG // dCBDb3Jwb3JhdGlvbjEoMCYGA1UEAxMfTWljcm9zb2Z0
// SIG // IENvZGUgU2lnbmluZyBQQ0EgMjAxMTCCAiIwDQYJKoZI
// SIG // hvcNAQEBBQADggIPADCCAgoCggIBAKvw+nIQHC6t2G6q
// SIG // ghBNNLrytlghn0IbKmvpWlCquAY4GgRJun/DDB7dN2vG
// SIG // EtgL8DjCmQawyDnVARQxQtOJDXlkh36UYCRsr55JnOlo
// SIG // XtLfm1OyCizDr9mpK656Ca/XllnKYBoF6WZ26DJSJhIv
// SIG // 56sIUM+zRLdd2MQuA3WraPPLbfM6XKEW9Ea64DhkrG5k
// SIG // NXimoGMPLdNAk/jj3gcN1Vx5pUkp5w2+oBN3vpQ97/vj
// SIG // K1oQH01WKKJ6cuASOrdJXtjt7UORg9l7snuGG9k+sYxd
// SIG // 6IlPhBryoS9Z5JA7La4zWMW3Pv4y07MDPbGyr5I4ftKd
// SIG // gCz1TlaRITUlwzluZH9TupwPrRkjhMv0ugOGjfdf8NBS
// SIG // v4yUh7zAIXQlXxgotswnKDglmDlKNs98sZKuHCOnqWbs
// SIG // YR9q4ShJnV+I4iVd0yFLPlLEtVc/JAPw0XpbL9Uj43Bd
// SIG // D1FGd7P4AOG8rAKCX9vAFbO9G9RVS+c5oQ/pI0m8GLhE
// SIG // fEXkwcNyeuBy5yTfv0aZxe/CHFfbg43sTUkwp6uO3+xb
// SIG // n6/83bBm4sGXgXvt1u1L50kppxMopqd9Z4DmimJ4X7Iv
// SIG // hNdXnFy/dygo8e1twyiPLI9AN0/B4YVEicQJTMXUpUMv
// SIG // dJX3bvh4IFgsE11glZo+TzOE2rCIF96eTvSWsLxGoGyY
// SIG // 0uDWiIwLAgMBAAGjggHtMIIB6TAQBgkrBgEEAYI3FQEE
// SIG // AwIBADAdBgNVHQ4EFgQUSG5k5VAF04KqFzc3IrVtqMp1
// SIG // ApUwGQYJKwYBBAGCNxQCBAweCgBTAHUAYgBDAEEwCwYD
// SIG // VR0PBAQDAgGGMA8GA1UdEwEB/wQFMAMBAf8wHwYDVR0j
// SIG // BBgwFoAUci06AjGQQ7kUBU7h6qfHMdEjiTQwWgYDVR0f
// SIG // BFMwUTBPoE2gS4ZJaHR0cDovL2NybC5taWNyb3NvZnQu
// SIG // Y29tL3BraS9jcmwvcHJvZHVjdHMvTWljUm9vQ2VyQXV0
// SIG // MjAxMV8yMDExXzAzXzIyLmNybDBeBggrBgEFBQcBAQRS
// SIG // MFAwTgYIKwYBBQUHMAKGQmh0dHA6Ly93d3cubWljcm9z
// SIG // b2Z0LmNvbS9wa2kvY2VydHMvTWljUm9vQ2VyQXV0MjAx
// SIG // MV8yMDExXzAzXzIyLmNydDCBnwYDVR0gBIGXMIGUMIGR
// SIG // BgkrBgEEAYI3LgMwgYMwPwYIKwYBBQUHAgEWM2h0dHA6
// SIG // Ly93d3cubWljcm9zb2Z0LmNvbS9wa2lvcHMvZG9jcy9w
// SIG // cmltYXJ5Y3BzLmh0bTBABggrBgEFBQcCAjA0HjIgHQBM
// SIG // AGUAZwBhAGwAXwBwAG8AbABpAGMAeQBfAHMAdABhAHQA
// SIG // ZQBtAGUAbgB0AC4gHTANBgkqhkiG9w0BAQsFAAOCAgEA
// SIG // Z/KGpZjgVHkaLtPYdGcimwuWEeFjkplCln3SeQyQwWVf
// SIG // Liw++MNy0W2D/r4/6ArKO79HqaPzadtjvyI1pZddZYSQ
// SIG // fYtGUFXYDJJ80hpLHPM8QotS0LD9a+M+By4pm+Y9G6XU
// SIG // tR13lDni6WTJRD14eiPzE32mkHSDjfTLJgJGKsKKELuk
// SIG // qQUMm+1o+mgulaAqPyprWEljHwlpblqYluSD9MCP80Yr
// SIG // 3vw70L01724lruWvJ+3Q3fMOr5kol5hNDj0L8giJ1h/D
// SIG // Mhji8MUtzluetEk5CsYKwsatruWy2dsViFFFWDgycSca
// SIG // f7H0J/jeLDogaZiyWYlobm+nt3TDQAUGpgEqKD6CPxNN
// SIG // ZgvAs0314Y9/HG8VfUWnduVAKmWjw11SYobDHWM2l4bf
// SIG // 2vP48hahmifhzaWX0O5dY0HjWwechz4GdwbRBrF1HxS+
// SIG // YWG18NzGGwS+30HHDiju3mUv7Jf2oVyW2ADWoUa9WfOX
// SIG // pQlLSBCZgB/QACnFsZulP0V3HjXG0qKin3p6IvpIlR+r
// SIG // +0cjgPWe+L9rt0uX4ut1eBrs6jeZeRhL/9azI2h15q/6
// SIG // /IvrC4DqaTuv/DDtBEyO3991bWORPdGdVk5Pv4BXIqF4
// SIG // ETIheu9BCrE/+6jMpF3BoYibV3FWTkhFwELJm3ZbCoBI
// SIG // a/15n8G9bW1qyVJzEw16UM0xghoKMIIaBgIBATCBlTB+
// SIG // MQswCQYDVQQGEwJVUzETMBEGA1UECBMKV2FzaGluZ3Rv
// SIG // bjEQMA4GA1UEBxMHUmVkbW9uZDEeMBwGA1UEChMVTWlj
// SIG // cm9zb2Z0IENvcnBvcmF0aW9uMSgwJgYDVQQDEx9NaWNy
// SIG // b3NvZnQgQ29kZSBTaWduaW5nIFBDQSAyMDExAhMzAAAE
// SIG // hV6Z7A5ZL83XAAAAAASFMA0GCWCGSAFlAwQCAQUAoIGu
// SIG // MBkGCSqGSIb3DQEJAzEMBgorBgEEAYI3AgEEMBwGCisG
// SIG // AQQBgjcCAQsxDjAMBgorBgEEAYI3AgEVMC8GCSqGSIb3
// SIG // DQEJBDEiBCAZFWo2Js81cGsVn5fbK7skbGJI+Udvm5a6
// SIG // rNw+7I5qlzBCBgorBgEEAYI3AgEMMTQwMqAUgBIATQBp
// SIG // AGMAcgBvAHMAbwBmAHShGoAYaHR0cDovL3d3dy5taWNy
// SIG // b3NvZnQuY29tMA0GCSqGSIb3DQEBAQUABIIBAHcUTPvl
// SIG // 72h2eS1g6IJs7AWkKdY+fTka6jAK0iEiTUYW0HK0kv8d
// SIG // BwZ99b1yMo9Mawac7YBkDanX0rprbpTUF+Opz+p5yrs7
// SIG // HBfZGsRo83+Vkwm1fQLh6PVk2aD9g4R24EL/9ZVucQdE
// SIG // nMXhuvUDXvhwSEC225q0HIeSsj8WKkuq8z4+gm2EavPt
// SIG // YOe8a+vDl00ba5QSqDQtK1YFqWiArgnHBs2hOLPBPt9V
// SIG // LArWJvgGzGEdFpuEhFMP+FT7NtzdPEahz0r3pS1gutoX
// SIG // jMPuKuub1vokg1kfs2b9tE1hvJoi2eJeqVqfsZCp7qFV
// SIG // 03Uqauh03gS/GXIBf5r3kFMAtmChgheUMIIXkAYKKwYB
// SIG // BAGCNwMDATGCF4Awghd8BgkqhkiG9w0BBwKgghdtMIIX
// SIG // aQIBAzEPMA0GCWCGSAFlAwQCAQUAMIIBUgYLKoZIhvcN
// SIG // AQkQAQSgggFBBIIBPTCCATkCAQEGCisGAQQBhFkKAwEw
// SIG // MTANBglghkgBZQMEAgEFAAQgaFaZtx2Fta0QQO3mtydG
// SIG // gHgLbxPE9TVjfOvjHxcgR+wCBmm4Xo4WFhgTMjAyNjAz
// SIG // MjAxOTU4NTguMTg3WjAEgAIB9KCB0aSBzjCByzELMAkG
// SIG // A1UEBhMCVVMxEzARBgNVBAgTCldhc2hpbmd0b24xEDAO
// SIG // BgNVBAcTB1JlZG1vbmQxHjAcBgNVBAoTFU1pY3Jvc29m
// SIG // dCBDb3Jwb3JhdGlvbjElMCMGA1UECxMcTWljcm9zb2Z0
// SIG // IEFtZXJpY2EgT3BlcmF0aW9uczEnMCUGA1UECxMeblNo
// SIG // aWVsZCBUU1MgRVNOOkEwMDAtMDVFMC1EOTQ3MSUwIwYD
// SIG // VQQDExxNaWNyb3NvZnQgVGltZS1TdGFtcCBTZXJ2aWNl
// SIG // oIIR6jCCByAwggUIoAMCAQICEzMAAAIruwBQ/007mqEA
// SIG // AQAAAiswDQYJKoZIhvcNAQELBQAwfDELMAkGA1UEBhMC
// SIG // VVMxEzARBgNVBAgTCldhc2hpbmd0b24xEDAOBgNVBAcT
// SIG // B1JlZG1vbmQxHjAcBgNVBAoTFU1pY3Jvc29mdCBDb3Jw
// SIG // b3JhdGlvbjEmMCQGA1UEAxMdTWljcm9zb2Z0IFRpbWUt
// SIG // U3RhbXAgUENBIDIwMTAwHhcNMjYwMjE5MTk0MDExWhcN
// SIG // MjcwNTE3MTk0MDExWjCByzELMAkGA1UEBhMCVVMxEzAR
// SIG // BgNVBAgTCldhc2hpbmd0b24xEDAOBgNVBAcTB1JlZG1v
// SIG // bmQxHjAcBgNVBAoTFU1pY3Jvc29mdCBDb3Jwb3JhdGlv
// SIG // bjElMCMGA1UECxMcTWljcm9zb2Z0IEFtZXJpY2EgT3Bl
// SIG // cmF0aW9uczEnMCUGA1UECxMeblNoaWVsZCBUU1MgRVNO
// SIG // OkEwMDAtMDVFMC1EOTQ3MSUwIwYDVQQDExxNaWNyb3Nv
// SIG // ZnQgVGltZS1TdGFtcCBTZXJ2aWNlMIICIjANBgkqhkiG
// SIG // 9w0BAQEFAAOCAg8AMIICCgKCAgEAl95oujg97MlKkJuE
// SIG // KoJKyj23LCv0Md32HLS/PlTNbjmN26KIuRscGrk4EH+i
// SIG // RRyE06MUu4I6ipSvDhS8y+lE5dI8RCubeg7jnICV3b7r
// SIG // YpqE5TktAt5MiE1wQF6I/4KeoUUfc+lkYqdSrZIpW93S
// SIG // Vwo0Kk/T9grro6/lc/K/mfow5dPY4v4nP+Bt+K95lcI7
// SIG // P/xp8fT7t9VfK1xYnDYgM8abm2sKW3fKan85Vk9r5xt5
// SIG // BfZejIkRG7yd1xy1MB0LIdLf060hcf7P8gqqSVmCeqAp
// SIG // Ru9Lb7BR9GkT/MAeHD/whWtiC75NuotznCQZfqaiox00
// SIG // gcvZr8EzxA5Z83KNDbfEeqUj012YAbLHB4aCnwtFkJjs
// SIG // 2NpHl2wJkU3GTMl8+b/wCW5qCNMtOwWs77eTZF3XRvUx
// SIG // K0FsLbBciCqxJQ4Fnx3gqE7tcLtnIg93Su9s93GtoM6B
// SIG // A8U9o/QVyFCmok803UD0bADGjt3VNM2hsDDJcLUicg4d
// SIG // eGBIGaFLub0vDLoDKnazY6Yci+ucioY6QFm4WJCBzv9L
// SIG // mY7vebT/M2TalyEYeLXX1hyTwE5/a/nMZMrodsdFS3X8
// SIG // dZZivV9zYx9DbYALOSQf8DpZMrrncZhU31lckay9+4rK
// SIG // TmfGjwBYL8kenDU5BqZBaN+SUY3IjZmYlOKk/VLcvleY
// SIG // LnRZNY8CAwEAAaOCAUkwggFFMB0GA1UdDgQWBBQ+Fo7k
// SIG // E1CW7W3d45r2ZLtBWdnlNjAfBgNVHSMEGDAWgBSfpxVd
// SIG // AF5iXYP05dJlpxtTNRnpcjBfBgNVHR8EWDBWMFSgUqBQ
// SIG // hk5odHRwOi8vd3d3Lm1pY3Jvc29mdC5jb20vcGtpb3Bz
// SIG // L2NybC9NaWNyb3NvZnQlMjBUaW1lLVN0YW1wJTIwUENB
// SIG // JTIwMjAxMCgxKS5jcmwwbAYIKwYBBQUHAQEEYDBeMFwG
// SIG // CCsGAQUFBzAChlBodHRwOi8vd3d3Lm1pY3Jvc29mdC5j
// SIG // b20vcGtpb3BzL2NlcnRzL01pY3Jvc29mdCUyMFRpbWUt
// SIG // U3RhbXAlMjBQQ0ElMjAyMDEwKDEpLmNydDAMBgNVHRMB
// SIG // Af8EAjAAMBYGA1UdJQEB/wQMMAoGCCsGAQUFBwMIMA4G
// SIG // A1UdDwEB/wQEAwIHgDANBgkqhkiG9w0BAQsFAAOCAgEA
// SIG // zvwirHIhDPJK9X6h+E5X0+uhDaE48V8PNdKchKtD3a4C
// SIG // 8H4E98ftYM+wkB7VHXr6jEOah8gy4ZuqU/ddQmJBjfuo
// SIG // PjFO3zGE6+nd0sYnicASKFpH0eIO0orRszClOOuShGHo
// SIG // 33XaFIKLwv8XEaWgCzuad/wNuPAcoSYjLbQUDQ7bE/x2
// SIG // ghcERQlEW8v3/HNZJMvBfMZAlxc/vzLWeXdZVhY8DiNo
// SIG // HmR1qvV4oQzoHnuZ0tpKKOVep/FxtttFE3r1X/qYJqSB
// SIG // +9Vyg1SGExhmSbOsj5Xydml6sNTBODUeqJDbGNz9TN9R
// SIG // +gzGEXyRjQTXqefeZFxod2MwN3AosoPo5iefIf307454
// SIG // CKblBXzg6Q4xcdInNWKCwDcYQhd0YUvamDOyuNDRISrI
// SIG // WLmgJCBtlwSmIoN6/9P29LI74wcLOeQGKJzJtwPKnF/+
// SIG // pPVX3NJr/XbaJx7lhnwNm/qhNqqQp4cxm3Qx6u4jkmRM
// SIG // NNZzbqQDH9XONZPSKE0Ns94sOsOGWaCzsoOEyjG6dZK6
// SIG // U+La4qf8t9Ar+ZIcqggzaml0KQZDmDjfC4LaEN2plTl+
// SIG // 4seY3a58f71MU1EooF761nS+1JPJKZktM7aNk6Mu2k+a
// SIG // Acwk734/YifwTfxNb4RQZISQr2ez1b7DEp005pMdhWpd
// SIG // pVZM7bgCOOHw/7siyXWjEEswggdxMIIFWaADAgECAhMz
// SIG // AAAAFcXna54Cm0mZAAAAAAAVMA0GCSqGSIb3DQEBCwUA
// SIG // MIGIMQswCQYDVQQGEwJVUzETMBEGA1UECBMKV2FzaGlu
// SIG // Z3RvbjEQMA4GA1UEBxMHUmVkbW9uZDEeMBwGA1UEChMV
// SIG // TWljcm9zb2Z0IENvcnBvcmF0aW9uMTIwMAYDVQQDEylN
// SIG // aWNyb3NvZnQgUm9vdCBDZXJ0aWZpY2F0ZSBBdXRob3Jp
// SIG // dHkgMjAxMDAeFw0yMTA5MzAxODIyMjVaFw0zMDA5MzAx
// SIG // ODMyMjVaMHwxCzAJBgNVBAYTAlVTMRMwEQYDVQQIEwpX
// SIG // YXNoaW5ndG9uMRAwDgYDVQQHEwdSZWRtb25kMR4wHAYD
// SIG // VQQKExVNaWNyb3NvZnQgQ29ycG9yYXRpb24xJjAkBgNV
// SIG // BAMTHU1pY3Jvc29mdCBUaW1lLVN0YW1wIFBDQSAyMDEw
// SIG // MIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEA
// SIG // 5OGmTOe0ciELeaLL1yR5vQ7VgtP97pwHB9KpbE51yMo1
// SIG // V/YBf2xK4OK9uT4XYDP/XE/HZveVU3Fa4n5KWv64NmeF
// SIG // RiMMtY0Tz3cywBAY6GB9alKDRLemjkZrBxTzxXb1hlDc
// SIG // wUTIcVxRMTegCjhuje3XD9gmU3w5YQJ6xKr9cmmvHaus
// SIG // 9ja+NSZk2pg7uhp7M62AW36MEBydUv626GIl3GoPz130
// SIG // /o5Tz9bshVZN7928jaTjkY+yOSxRnOlwaQ3KNi1wjjHI
// SIG // NSi947SHJMPgyY9+tVSP3PoFVZhtaDuaRr3tpK56KTes
// SIG // y+uDRedGbsoy1cCGMFxPLOJiss254o2I5JasAUq7vnGp
// SIG // F1tnYN74kpEeHT39IM9zfUGaRnXNxF803RKJ1v2lIH1+
// SIG // /NmeRd+2ci/bfV+AutuqfjbsNkz2K26oElHovwUDo9Fz
// SIG // pk03dJQcNIIP8BDyt0cY7afomXw/TNuvXsLz1dhzPUNO
// SIG // wTM5TI4CvEJoLhDqhFFG4tG9ahhaYQFzymeiXtcodgLi
// SIG // Mxhy16cg8ML6EgrXY28MyTZki1ugpoMhXV8wdJGUlNi5
// SIG // UPkLiWHzNgY1GIRH29wb0f2y1BzFa/ZcUlFdEtsluq9Q
// SIG // BXpsxREdcu+N+VLEhReTwDwV2xo3xwgVGD94q0W29R6H
// SIG // XtqPnhZyacaue7e3PmriLq0CAwEAAaOCAd0wggHZMBIG
// SIG // CSsGAQQBgjcVAQQFAgMBAAEwIwYJKwYBBAGCNxUCBBYE
// SIG // FCqnUv5kxJq+gpE8RjUpzxD/LwTuMB0GA1UdDgQWBBSf
// SIG // pxVdAF5iXYP05dJlpxtTNRnpcjBcBgNVHSAEVTBTMFEG
// SIG // DCsGAQQBgjdMg30BATBBMD8GCCsGAQUFBwIBFjNodHRw
// SIG // Oi8vd3d3Lm1pY3Jvc29mdC5jb20vcGtpb3BzL0RvY3Mv
// SIG // UmVwb3NpdG9yeS5odG0wEwYDVR0lBAwwCgYIKwYBBQUH
// SIG // AwgwGQYJKwYBBAGCNxQCBAweCgBTAHUAYgBDAEEwCwYD
// SIG // VR0PBAQDAgGGMA8GA1UdEwEB/wQFMAMBAf8wHwYDVR0j
// SIG // BBgwFoAU1fZWy4/oolxiaNE9lJBb186aGMQwVgYDVR0f
// SIG // BE8wTTBLoEmgR4ZFaHR0cDovL2NybC5taWNyb3NvZnQu
// SIG // Y29tL3BraS9jcmwvcHJvZHVjdHMvTWljUm9vQ2VyQXV0
// SIG // XzIwMTAtMDYtMjMuY3JsMFoGCCsGAQUFBwEBBE4wTDBK
// SIG // BggrBgEFBQcwAoY+aHR0cDovL3d3dy5taWNyb3NvZnQu
// SIG // Y29tL3BraS9jZXJ0cy9NaWNSb29DZXJBdXRfMjAxMC0w
// SIG // Ni0yMy5jcnQwDQYJKoZIhvcNAQELBQADggIBAJ1Vffwq
// SIG // reEsH2cBMSRb4Z5yS/ypb+pcFLY+TkdkeLEGk5c9MTO1
// SIG // OdfCcTY/2mRsfNB1OW27DzHkwo/7bNGhlBgi7ulmZzpT
// SIG // Td2YurYeeNg2LpypglYAA7AFvonoaeC6Ce5732pvvinL
// SIG // btg/SHUB2RjebYIM9W0jVOR4U3UkV7ndn/OOPcbzaN9l
// SIG // 9qRWqveVtihVJ9AkvUCgvxm2EhIRXT0n4ECWOKz3+SmJ
// SIG // w7wXsFSFQrP8DJ6LGYnn8AtqgcKBGUIZUnWKNsIdw2Fz
// SIG // Lixre24/LAl4FOmRsqlb30mjdAy87JGA0j3mSj5mO0+7
// SIG // hvoyGtmW9I/2kQH2zsZ0/fZMcm8Qq3UwxTSwethQ/gpY
// SIG // 3UA8x1RtnWN0SCyxTkctwRQEcb9k+SS+c23Kjgm9swFX
// SIG // SVRk2XPXfx5bRAGOWhmRaw2fpCjcZxkoJLo4S5pu+yFU
// SIG // a2pFEUep8beuyOiJXk+d0tBMdrVXVAmxaQFEfnyhYWxz
// SIG // /gq77EFmPWn9y8FBSX5+k77L+DvktxW/tM4+pTFRhLy/
// SIG // AsGConsXHRWJjXD+57XQKBqJC4822rpM+Zv/Cuk0+CQ1
// SIG // ZyvgDbjmjJnW4SLq8CdCPSWU5nR0W2rRnj7tfqAxM328
// SIG // y+l7vzhwRNGQ8cirOoo6CGJ/2XBjU02N7oJtpQUQwXEG
// SIG // ahC0HVUzWLOhcGbyoYIDTTCCAjUCAQEwgfmhgdGkgc4w
// SIG // gcsxCzAJBgNVBAYTAlVTMRMwEQYDVQQIEwpXYXNoaW5n
// SIG // dG9uMRAwDgYDVQQHEwdSZWRtb25kMR4wHAYDVQQKExVN
// SIG // aWNyb3NvZnQgQ29ycG9yYXRpb24xJTAjBgNVBAsTHE1p
// SIG // Y3Jvc29mdCBBbWVyaWNhIE9wZXJhdGlvbnMxJzAlBgNV
// SIG // BAsTHm5TaGllbGQgVFNTIEVTTjpBMDAwLTA1RTAtRDk0
// SIG // NzElMCMGA1UEAxMcTWljcm9zb2Z0IFRpbWUtU3RhbXAg
// SIG // U2VydmljZaIjCgEBMAcGBSsOAwIaAxUACaw/dMpB6aP9
// SIG // ABm+5ZsL7ArakTmggYMwgYCkfjB8MQswCQYDVQQGEwJV
// SIG // UzETMBEGA1UECBMKV2FzaGluZ3RvbjEQMA4GA1UEBxMH
// SIG // UmVkbW9uZDEeMBwGA1UEChMVTWljcm9zb2Z0IENvcnBv
// SIG // cmF0aW9uMSYwJAYDVQQDEx1NaWNyb3NvZnQgVGltZS1T
// SIG // dGFtcCBQQ0EgMjAxMDANBgkqhkiG9w0BAQsFAAIFAO1o
// SIG // Io0wIhgPMjAyNjAzMjAxOTQ2MjFaGA8yMDI2MDMyMTE5
// SIG // NDYyMVowdDA6BgorBgEEAYRZCgQBMSwwKjAKAgUA7Wgi
// SIG // jQIBADAHAgEAAgIKbDAHAgEAAgIUvDAKAgUA7Wl0DQIB
// SIG // ADA2BgorBgEEAYRZCgQCMSgwJjAMBgorBgEEAYRZCgMC
// SIG // oAowCAIBAAIDB6EgoQowCAIBAAIDAYagMA0GCSqGSIb3
// SIG // DQEBCwUAA4IBAQB4aGtoKk6W0z7Xl8E25WzKjUJNb5iH
// SIG // 9mzFTMTX4G4Dag2AL75LV7BvD/rvgrw9ac6DFeEdlk5x
// SIG // g/7WgY0a7lMHIm3Zwsuc8KAM/5hlKbrXiS8+/0pkcfNP
// SIG // N/I/AvMe9BDp5slzRydQnRVuEwOKY3xhA+EYMe1OLdhF
// SIG // ewD280qMSwvVzAJlBnPHKfwqa/pxiMdBKgYAkmVmo7Jg
// SIG // gPbGPvueNMp/C/jfsZYqaLWQr/vnyytA3ZWdM2zcQro0
// SIG // sNhrqKwBJEe1xQbuNEJKC7dFSIY7t4O7+mxmMc4jlepW
// SIG // TMC3sbhHFOrhQmsBNyOo0sQnCE/0QCtVC+6iHBRkOO1Q
// SIG // W7KEMYIEDTCCBAkCAQEwgZMwfDELMAkGA1UEBhMCVVMx
// SIG // EzARBgNVBAgTCldhc2hpbmd0b24xEDAOBgNVBAcTB1Jl
// SIG // ZG1vbmQxHjAcBgNVBAoTFU1pY3Jvc29mdCBDb3Jwb3Jh
// SIG // dGlvbjEmMCQGA1UEAxMdTWljcm9zb2Z0IFRpbWUtU3Rh
// SIG // bXAgUENBIDIwMTACEzMAAAIruwBQ/007mqEAAQAAAisw
// SIG // DQYJYIZIAWUDBAIBBQCgggFKMBoGCSqGSIb3DQEJAzEN
// SIG // BgsqhkiG9w0BCRABBDAvBgkqhkiG9w0BCQQxIgQghgjX
// SIG // BPFCXAkSFCf8hAzw/7fSgJHr3Mxi2cWriRyGRigwgfoG
// SIG // CyqGSIb3DQEJEAIvMYHqMIHnMIHkMIG9BCByDiP0P5BX
// SIG // 7WAPjNjmPtQcd2owQ+v1gwLT09rxZL9uUjCBmDCBgKR+
// SIG // MHwxCzAJBgNVBAYTAlVTMRMwEQYDVQQIEwpXYXNoaW5n
// SIG // dG9uMRAwDgYDVQQHEwdSZWRtb25kMR4wHAYDVQQKExVN
// SIG // aWNyb3NvZnQgQ29ycG9yYXRpb24xJjAkBgNVBAMTHU1p
// SIG // Y3Jvc29mdCBUaW1lLVN0YW1wIFBDQSAyMDEwAhMzAAAC
// SIG // K7sAUP9NO5qhAAEAAAIrMCIEICsOk1EBW61L4FcwcXtp
// SIG // YDYwcitnFQwQ0fSGq5YK00F8MA0GCSqGSIb3DQEBCwUA
// SIG // BIICAJRVdsdM6PemVC3a89Pj+n2bXf+RX3jgchkAD9Vj
// SIG // uZNBTQDHnTKdtOdkxVs15npHEjwSiMXL2bGFE6+9zkjp
// SIG // DJIOTLess4Q1LDPSZup8bCtCPrelGXFruS1UWX5w/k76
// SIG // prGpLzfTjH0ATJ1xBZdRgOracYQgJls2vikmrK3kJoRR
// SIG // 4z4Z3qfU2FXZmitARjQhnRRKekmheF/MwAuPVlCuWtMw
// SIG // 2FNf/KxLI/+9BzK25PQCCT89E9/Oq5OX5NU7K2c28RKu
// SIG // zJqBAK1EWL4xmaxRzwD5hvA5ChfF3QJuURjc6OMD5y01
// SIG // ZD4xaj46fIkk02r9eR7R+yRGDrcAM3P6tTOLfpvjpU77
// SIG // ZQeBISk5zbpC3cG8KouqQBjrbDMubG3thib9j1zNdJQp
// SIG // FjRI5tB1JpOW6fpJ4YkfkXcbSsH4LYWpnKVIsQ2PSAD1
// SIG // xiI10wmTaQSIKefpiB6cy3x38mJhYItNqqt20nCrea0J
// SIG // /aVORyUuX9L5KWtp3T7ttknKyyu+CqvEjnBlInnEhDiG
// SIG // 9C5ePtjDRawNFCR2XNyk63PXPcNtDBOpN485XSATmMbU
// SIG // gDUqdOUIqNrldqVfa208OYqcT7ZHKBYaxvgPVTrXpMCx
// SIG // zEEgG3hBbOvVeborJCGxUKjlUidCQQFTaYPVC8Wo19Pq
// SIG // A+ZkToOKGC9OIBIThzKxtjJ+4nNV
// SIG // End signature block
