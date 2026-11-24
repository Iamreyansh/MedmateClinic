package com.medmate.clinic.grant;

import java.io.Serializable;
import java.util.UUID;

/** The pair that links a role to a grant. */
public record RoleGrantId(UUID roleId, UUID grantId) implements Serializable {}
