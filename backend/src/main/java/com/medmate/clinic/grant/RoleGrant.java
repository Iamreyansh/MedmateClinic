package com.medmate.clinic.grant;

import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

/** A grant inside a role. */
@Entity
@Table(name = "role_grants")
public class RoleGrant {

    @EmbeddedId
    private RoleGrantId id;

    public RoleGrantId getId() {
        return id;
    }

    public void setId(RoleGrantId id) {
        this.id = id;
    }
}
