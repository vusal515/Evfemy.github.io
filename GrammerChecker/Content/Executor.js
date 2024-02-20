!function() {
    let e = null;
    function t(t) {
        t && t.detail && t.detail.code && (t.stopImmediatePropagation(),
        function(t) {
            const n = document.createElement("script")
              , o = document.querySelector("link[nonce], style[nonce], script[nonce]");
            o && o.nonce && n.setAttribute("nonce", o.nonce),
            n.textContent = e ? e.createScript(t) : t,
            (document.head || document.documentElement).append(n),
            n.remove()
        }(t.detail.code))
    }
    function n(e) {
        document.querySelectorAll("lt-mirror:not([data-lt-linked]), lt-highlighter:not([data-lt-linked])").forEach((e=>{
            if (!e.nextElementSibling || !e.nextElementSibling.hasAttribute("data-lt-tmp-id"))
                return;
            const t = e.nextElementSibling;
            e.setAttribute("data-lt-linked", "1"),
            ["selectionStart", "selectionEnd", "value", "textContent", "innerHTML", "innerText", "required", "maxLength", "disabled", "readOnly", "contentEditable", "isContentEditable"].forEach((n=>{
                try {
                    Object.defineProperty(e, n, {
                        get: ()=>t[n],
                        set: e=>{
                            t[n] = e
                        }
                    })
                } catch (e) {}
            }
            ))
        }
        ))
    }
    self.trustedTypes?.createPolicy && (e = self.trustedTypes.createPolicy("LanguageTool_Executor_Policy", {
        createScript: e=>e
    })),
    document.addEventListener("lt-execute-link-properties", n),
    document.addEventListener("lt-execute-code", t),
    document.addEventListener("lt-execute-destroy", (function e() {
        document.removeEventListener("lt-execute-destroy", e),
        document.removeEventListener("lt-execute-link-properties", n),
        document.removeEventListener("lt-execute-code", t)
    }
    ))
}();
