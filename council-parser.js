(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.CouncilParser = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var MEMBER_IDS = ["friend", "expert", "sister"];
  var FIT_VALUES = ["low", "medium", "high"];

  function stripFence(text) {
    var t = String(text == null ? "" : text).trim();
    var fenced = t.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?\s*```$/i);
    if (fenced) return fenced[1].trim();
    t = t.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
    return t.trim();
  }

  function extractJsonObject(text) {
    var start = text.indexOf("{");
    var end = text.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) return null;
    return text.slice(start, end + 1);
  }

  function cleanStr(v, max) {
    if (typeof v !== "string") return "";
    return v.trim().slice(0, max || 2000);
  }

  function strArray(v, max, maxLen) {
    if (!Array.isArray(v)) return [];
    return v
      .filter(function (x) {
        return typeof x === "string" && x.trim();
      })
      .map(function (s) {
        return s.trim().slice(0, maxLen || 500);
      })
      .slice(0, max || 20);
  }

  function oneOf(v, allowed, fallback) {
    if (typeof v !== "string") return fallback;
    var lower = v.trim().toLowerCase();
    return allowed.indexOf(lower) !== -1 ? lower : fallback;
  }

  function normalizeCouncilData(raw) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;

    var rawMembers = Array.isArray(raw.members) ? raw.members : [];
    var byId = {};
    rawMembers.forEach(function (m) {
      if (!m || typeof m !== "object") return;
      var id = MEMBER_IDS.indexOf(m.id) !== -1 ? m.id : "";
      if (!id || byId[id]) return;
      var opinion = cleanStr(m.opinion, 2500);
      if (!opinion) return;
      byId[id] = {
        id: id,
        opinion: opinion,
        knownFacts: strArray(m.knownFacts, 6),
        assumptions: strArray(m.assumptions, 6),
        responseToPrevious: cleanStr(m.responseToPrevious, 1000)
      };
    });
    var members = MEMBER_IDS.filter(function (id) {
      return byId[id];
    }).map(function (id) {
      return byId[id];
    });

    var rawOptions = Array.isArray(raw.decisionOptions) ? raw.decisionOptions : [];
    var decisionOptions = rawOptions
      .map(function (o) {
        if (!o || typeof o !== "object") return null;
        var title = cleanStr(o.title, 300);
        if (!title) return null;
        return {
          title: title,
          benefits: strArray(o.benefits, 6),
          risks: strArray(o.risks, 6),
          verify: strArray(o.verify, 6),
          fit: oneOf(o.fit, FIT_VALUES, "medium")
        };
      })
      .filter(Boolean)
      .slice(0, 4);

    var rawPlan = Array.isArray(raw.actionPlan) ? raw.actionPlan : [];
    var actionPlan = rawPlan
      .map(function (s) {
        if (!s || typeof s !== "object") return null;
        var title = cleanStr(s.title, 400);
        if (!title) return null;
        return {
          title: title,
          timing: cleanStr(s.timing, 200),
          done: !!s.done
        };
      })
      .filter(Boolean)
      .slice(0, 3);

    var needsClarification = !!raw.needsClarification;
    var clarifyingQuestions = strArray(raw.clarifyingQuestions, 3, 400);
    if (needsClarification && !clarifyingQuestions.length) {
      needsClarification = false;
    }

    return {
      needsClarification: needsClarification,
      clarifyingQuestions: clarifyingQuestions,
      members: members,
      decisionOptions: decisionOptions,
      boundaries: strArray(raw.boundaries, 6),
      consensus: cleanStr(raw.consensus, 2000),
      uncertainties: strArray(raw.uncertainties, 6),
      recommendation: cleanStr(raw.recommendation, 2000),
      confidence: oneOf(raw.confidence, FIT_VALUES, "medium"),
      actionPlan: actionPlan
    };
  }

  function tryParseJson(text) {
    if (!text || !text.trim()) return null;
    var stripped = stripFence(text);
    var candidates = [stripped, extractJsonObject(stripped)];
    for (var i = 0; i < candidates.length; i++) {
      if (!candidates[i]) continue;
      try {
        var normalized = normalizeCouncilData(JSON.parse(candidates[i]));
        if (normalized) return normalized;
      } catch (e) {
        /* thử candidate kế tiếp */
      }
    }
    return null;
  }

  function normalizeCouncilName(name) {
    return String(name == null ? "" : name)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/Đ/g, "D")
      .replace(/đ/g, "d")
      .replace(/\s+/g, " ")
      .trim()
      .toUpperCase();
  }

  function parseCouncilSections(text) {
    var re = /\[\s*(BẠN\s*THÂN|BAN\s*THAN|CHUYÊN\s*GIA|CHUYEN\s*GIA|CHỊ\s*ĐẠI|CHI\s*DAI|KẾT\s*LUẬN|KET\s*LUAN)[^\]]*\]/gi;
    var sections = [];
    var match;
    var lastIndex = 0;
    var current = null;
    while ((match = re.exec(text))) {
      if (current) {
        current.body = text
          .slice(lastIndex, match.index)
          .replace(/^\s*(?:\*\*|__)\s*(?:\r?\n|$)/, "")
          .replace(/(?:\r?\n)?\s*(?:\*\*|__)\s*$/, "")
          .trim();
      }
      current = { name: normalizeCouncilName(match[1]), body: "" };
      sections.push(current);
      lastIndex = re.lastIndex;
    }
    if (current) {
      current.body = text
        .slice(lastIndex)
        .replace(/^\s*(?:\*\*|__)\s*(?:\r?\n|$)/, "")
        .trim();
    }
    return sections;
  }

  function councilMeta(name) {
    var normalized = normalizeCouncilName(name);
    if (normalized.indexOf("BAN THAN") !== -1)
      return { emoji: "😎", label: "Bạn thân", key: "friend" };
    if (normalized.indexOf("CHUYEN GIA") !== -1)
      return { emoji: "🩺", label: "Chuyên gia", key: "expert" };
    if (normalized.indexOf("CHI DAI") !== -1)
      return { emoji: "💅", label: "Chị đại", key: "sister" };
    return { emoji: "✨", label: "Kết luận hội đồng", final: true };
  }

  function parseCouncilResponse(text) {
    if (!text || typeof text !== "string") return null;
    var data = tryParseJson(text);
    if (data && (data.needsClarification || data.members.length)) {
      return { kind: "json", data: data };
    }
    var sections = parseCouncilSections(text);
    if (sections.length >= 2) {
      return { kind: "legacy", sections: sections };
    }
    return null;
  }

  return {
    stripFence: stripFence,
    normalizeCouncilData: normalizeCouncilData,
    tryParseJson: tryParseJson,
    normalizeCouncilName: normalizeCouncilName,
    parseCouncilSections: parseCouncilSections,
    councilMeta: councilMeta,
    parseCouncilResponse: parseCouncilResponse
  };
});
