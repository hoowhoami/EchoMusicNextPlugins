// Ported from Folia a8da4437, AGPL-3.0-only. See docs/folia/cappella-reference.md.
const normalizeAgentId = (agentId) => {
  const trimmed = agentId == null ? void 0 : agentId.trim();
  return trimmed ? trimmed : null;
};
const collectDistinctAgentIds = (lines) => {
  const ids = [];
  const seen = /* @__PURE__ */ new Set();
  lines.forEach((line) => {
    const agentId = normalizeAgentId(line.agentId);
    if (!agentId || seen.has(agentId)) {
      return;
    }
    seen.add(agentId);
    ids.push(agentId);
  });
  return ids;
};
const createCappellaAgentSenderResolver = (lines, options) => {
  const agentIds = collectDistinctAgentIds(lines);
  if (agentIds.length < 2) {
    return null;
  }
  const rightAgentId = agentIds[0];
  const leftAvatarCount = Math.max(1, options.leftAvatarCount);
  const senderByAgentId = /* @__PURE__ */ new Map();
  agentIds.forEach((agentId, index) => {
    senderByAgentId.set(
      agentId,
      agentId === rightAgentId
        ? {
            side: 'right',
            avatarIndex: options.rightAvatarIndex,
          }
        : {
            side: 'left',
            avatarIndex: (index - 1) % leftAvatarCount,
          }
    );
  });
  return {
    resolve: (line) => {
      var _a;
      const agentId = normalizeAgentId(line.agentId);
      return agentId ? ((_a = senderByAgentId.get(agentId)) != null ? _a : null) : null;
    },
  };
};
export { createCappellaAgentSenderResolver };
