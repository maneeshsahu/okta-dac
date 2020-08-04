<template>
  <v-card max-width="900" min-height="600" class="mx-auto my-4">
    <v-overlay
      absolute
      :value="loading"
      class="d-flex align-center justify-center"
    >
      <v-progress-circular
        indeterminate
        size="80"
        height="20"
        color="white"
      ></v-progress-circular>
    </v-overlay>

    <v-container fluid>
      <v-expansion-panels>
        <v-expansion-panel v-for="task in tasks" :key="task.id">
          <v-expansion-panel-header>
            <v-row no-gutters>
              <v-col cols="4"
                >{{ task.profile.firstName }} {{ task.profile.lastName }}</v-col
              >
              <v-col cols="8" class="text--secondary">
                {{ task.profile.email }}
              </v-col>
            </v-row>
          </v-expansion-panel-header>
          <v-expansion-panel-content>
            <v-col cols="8" class="text--secondary">
              <v-list-item
                two-line
                v-for="propertyName in profileAttrs"
                :key="task.id + '-' + propertyName"
              >
                <v-list-item-content>
                  <v-list-item-title>{{ propertyName }}</v-list-item-title>
                  <v-list-item-subtitle>{{
                    task.profile[propertyName]
                  }}</v-list-item-subtitle>
                </v-list-item-content>
              </v-list-item>
              <v-list-item
                two-line
                v-for="profileinfo in profileInfo"
                :key="task.id + '-' + profileinfo"
              >
                <v-list-item-content>
                  <v-list-item-title>{{ profileinfo }}</v-list-item-title>
                  <v-list-item-subtitle>{{
                    task[profileinfo]
                  }}</v-list-item-subtitle>
                </v-list-item-content>
              </v-list-item>
            </v-col>
            <v-card-actions>
              <v-spacer></v-spacer>
              <v-btn text color="secondary" @click="denyUser(task.id)">
                Deny
              </v-btn>
              <v-btn text color="primary" @click="approveUser(task.id)">
                Approve
              </v-btn>
            </v-card-actions>
          </v-expansion-panel-content>
        </v-expansion-panel>
      </v-expansion-panels>
    </v-container>
  </v-card>
</template>

<script>
import axios from "axios";

export default {
  name: "tenant-apps",
  data() {
    return {
      loading: false,
      tasks: [],
      message: null,
      profileAttrs: ["firstName", "lastName", "email", "approvalStatus"],
      profileInfo: ["activated", "created", "status"],
    };
  },
  computed: {
    o4oToken() {
      return this.$store.getters.o4oToken;
    },
    tenants() {
      return this.$store.getters.tenants;
    },
    activeTenant() {
      return this.$store.getters.activeTenant;
    },
  },
  async created() {
    this.loadPendingTasks();
  },
  methods: {
    async approveUser(userId) {
      console.log("Approving User", userId);
      this.loading = true;
      try {
        const res1 = await axios.put(
          this.$config.api +
            "/api/v1/groups/" +
            this.activeTenant.group +
            "/users/" +
            userId,
          null,
          {
            headers: { Authorization: "Bearer " + this.o4oToken },
          }
        );
        console.log(res1.data);
        const res2 = await axios.delete(
          this.$config.api +
            "/api/v1/groups/" +
            this.activeTenant.pendingGroup +
            "/users/" +
            userId,
          {
            headers: { Authorization: "Bearer " + this.o4oToken },
          }
        );
        console.log(res2.data);
        // Update the pendingStatus attribute
        const res3 = await axios.post(
          this.$config.api + "/api/v1/users/" + userId,
          {
            profile: {
              approvalStatus: "approved",
            },
          },
          {
            headers: { Authorization: "Bearer " + this.o4oToken },
          }
        );
        console.log(res3.data);

        this.tasks = this.tasks.filter(function(task) {
          return task.id !== userId;
        });
      } catch (error) {
        this.message = `There was a problem approving user: ${error}`;
      }
      this.loading = false;
    },
    denyUser(userId) {
      console.log("Denying User", userId);
    },
    async loadPendingTasks() {
      console.log(this.o4oToken);
      console.log(this.activeTenant);
      this.loading = true;
      try {
        const res = await axios.get(
          this.$config.api +
            "/api/v1/groups/" +
            this.activeTenant.pendingGroup +
            "/users",
          {
            headers: { Authorization: "Bearer " + this.o4oToken },
          }
        );
        console.log(res.data);
        this.tasks = res.data;
      } catch (e) {
        this.message = `There was a problem loading tasks: ${e}`;
        this.tasks = [];
      }
      this.loading = false;
    },
  },
};
</script>
