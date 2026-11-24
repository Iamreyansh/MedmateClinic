package com.medmate.clinic.grant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class GrantServiceTest {

    private final RoleRepository roles = mock(RoleRepository.class);
    private final GrantRepository grants = mock(GrantRepository.class);
    private final RoleGrantRepository roleGrants = mock(RoleGrantRepository.class);

    private final GrantService service = new GrantService(roles, grants, roleGrants);

    @Test
    void aRoleGetsExactlyItsGrants() {
        UUID clinicId = UUID.randomUUID();
        UUID roleId = UUID.randomUUID();
        UUID console = UUID.randomUUID();

        Role role = new Role();
        role.setId(roleId);
        role.setClinicId(clinicId);
        role.setName("doctor");
        when(roles.findById(roleId)).thenReturn(Optional.of(role));

        Grant grant = new Grant();
        grant.setId(console);
        grant.setClinicId(clinicId);
        grant.setResource("console");
        grant.setLevel("use");
        when(grants.findById(console)).thenReturn(Optional.of(grant));

        RoleGrant link = new RoleGrant();
        link.setId(new RoleGrantId(roleId, console));
        when(roleGrants.findByIdRoleId(roleId)).thenReturn(List.of(link));

        Map<String, String> capabilities = service.capabilitiesFor(clinicId, roleId);

        assertThat(capabilities).containsExactly(Map.entry("console", "use"));
        assertThat(service.resourcesFor(clinicId, roleId)).containsExactly("console");
    }

    @Test
    void aRoleWithNoGrantsGetsNothing() {
        UUID clinicId = UUID.randomUUID();
        UUID roleId = UUID.randomUUID();

        Role role = new Role();
        role.setId(roleId);
        role.setClinicId(clinicId);
        when(roles.findById(roleId)).thenReturn(Optional.of(role));
        when(roleGrants.findByIdRoleId(roleId)).thenReturn(List.of());

        assertThat(service.capabilitiesFor(clinicId, roleId)).isEmpty();
    }
}
