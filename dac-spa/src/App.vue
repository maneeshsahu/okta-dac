<style scoped>
.no-deco {
  text-decoration: none;
}
</style>
<template>
  <v-app>
    <v-navigation-drawer v-model="drawer" app clipped dark v-if="authenticated">
      <v-list nav>
        <v-list-item two-line>
          <v-list-item-avatar>
            <img :src="gravatar" />
          </v-list-item-avatar>

          <v-list-item-content @click="$router.push('/tokens')">
            <v-list-item-title>{{ fullName }}</v-list-item-title>
            <v-list-item-subtitle>
              {{ isTenantAdmin ? $t("tenant") : "Super" }}
              Admin
            </v-list-item-subtitle>
          </v-list-item-content>
        </v-list-item>

        <v-divider></v-divider>

        <v-list-item v-for="item in menuItems" :key="item.title" link>
          <v-list-item-icon>
            <v-icon color="primary">{{ item.icon }}</v-icon>
          </v-list-item-icon>

          <router-link :to="item.route" class="no-deco white--text">
            <v-list-item-content>
              <v-list-item-title>{{ item.title }}</v-list-item-title>
            </v-list-item-content>
          </router-link>

          <v-list-item-action v-if="item.route === 'tasks' && pendingTasks > 0">
            <v-badge
              :content="pendingTasks"
              transition="slide-x-transition"
              color="error"
              :value="pendingTasks > 0"
              right
              inline
            >
              <v-icon color="grey lighten-1"></v-icon>
            </v-badge>
          </v-list-item-action>
        </v-list-item>

        <v-list-item></v-list-item>
      </v-list>

      <template v-slot:append>
        <div class="pa-4">
          <v-btn block @click="logout">Logout</v-btn>
        </div>
      </template>
    </v-navigation-drawer>
    <v-app-bar app clipped-left :color="$config.brand.color" dark flat>
      <v-app-bar-nav-icon @click.stop="drawer = !drawer" v-if="authenticated" />
      <v-img
        class="mx-2"
        :src="$config.brand.logo_inv"
        max-height="50"
        max-width="50"
        @click="$router.push('/')"
        contain
      ></v-img>
      <v-toolbar-title class="headline">
        <span
          class="font-weight-light"
          v-if="!$vuetify.breakpoint.xs"
          @click="$router.push('/')"
          >Delegated Admin Console</span
        >
      </v-toolbar-title>

      <v-spacer></v-spacer>

      <!-- <div v-if="authenticated && isTenantAdmin">
        <v-btn @click="$router.push('tenantTasks')">
          <v-badge
            :content="pendingTasks"
            transition="slide-x-transition"
            color="error"
            :value="pendingTasks > 0"
            left
          >
            <v-icon>
              mdi-bell
            </v-icon>
          </v-badge>
        </v-btn>
      </div> -->

      <div v-if="authenticated && isTenantAdmin">
        <v-select
          v-model="activeTenantId"
          :items="tenants"
          :label="$t('tenant')"
          item-value="idp"
          item-text="name"
          class="mt-6"
          width="50"
          @change="setActiveTenant"
          @selected="setActiveTenant"
          dense
          filled
        ></v-select>
      </div>

      <div class="pa-4" v-if="authenticated">
        <v-btn @click="logout">Logout</v-btn>
      </div>
    </v-app-bar>
    <v-main>
      <router-view />
    </v-main>
  </v-app>
</template>

<script>
import md5 from "md5";
import AuthJS from "@okta/okta-auth-js";
import axios from "axios";

export default {
  name: "App",
  data() {
    return {
      drawer: null,
      pendingTasks: 0,
      pendingInterval: null,
      authenticated: false,
      user: null,
      superuserFlag: false,
      isTenantAdmin: false,
      items: [
        { title: this.$t("home"), icon: "mdi-home-city", route: "/" },
        {
          title: this.$t("users"),
          icon: "mdi-account-group-outline",
          route: "users",
        },
        {
          title: this.$t("Apps"),
          icon: "mdi-apps",
          route: "apps",
        },
        {
          title: this.$t("settings"),
          icon: "mdi-account-cog",
          route: "settings",
        },
        {
          title: this.$t("tasks"),
          icon: "mdi-bell",
          route: "tasks",
        },
      ],
      suItems: [
        { title: this.$t("home"), icon: "mdi-home-city", route: "/" },
        { title: this.$t("tenants"), icon: "mdi-domain", route: "tenants" },
      ],
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
    activeTenantId() {
      let activeTenant = this.activeTenant;
      if (!activeTenant) {
        // If no selected tenant, then just choose the first from the drop-down list
        activeTenant = this.tenants[0];
      }
      return activeTenant.idp;
    },
    activeTenantLogo() {
      return this.isTenantAdmin ? this.tenantLogo(this.activeTenant) : "";
    },
    menuItems() {
      return this.isTenantAdmin ? this.items : this.suItems;
    },
    fullName() {
      return this.user ? this.user.name : "";
    },
    gravatar() {
      return this.user
        ? "https://www.gravatar.com/avatar/" + md5(this.user.preferred_username)
        : "";
    },
    companyLogo() {
      let company =
        this.user && Object.prototype.hasOwnProperty.call(this.user, "tenants")
          ? this.user.tenants[0].split(":")[1]
          : "okta";
      return "https://logo.clearbit.com/" + company + ".com";
    },
  },
  async created() {
    await this.isAuthenticated();
    this.$store.subscribe((mutation, state) => {
      console.log("Got mutation", mutation.type);
    });
    this.pendingInterval = setInterval(() => {
      this.calculatePendingTasks();
    }, 50000);
  },
  watch: {
    // Everytime the route changes, check for auth status
    $route: "isAuthenticated",
  },
  methods: {
    setTenants(tenantsClaim) {
      let tenants = this.user.tenants.map(function(tenant) {
        let tenantArray = tenant.split(":");
        return {
          idp: tenantArray[0],
          name: tenantArray[1],
          group: tenantArray[2],
          pendingGroup: tenantArray[3],
        };
      });

      this.$store.commit("setTenants", tenants);
    },
    setActiveTenant(tenantName) {
      console.log("setActiveTenant", tenantName);
      let tenantObj = this.tenants.filter((tenant) => {
        return (tenant.name = tenantName);
      })[0];
      // Using Vuex instead
      this.$store.commit("setActiveTenant", tenantObj);
    },
    tenantLogo(tenantName) {
      return "https://logo.clearbit.com/" + tenantName + ".com";
    },
    async isAuthenticated() {
      this.authenticated = await this.$auth.isAuthenticated();
      if (this.authenticated) {
        this.user = await this.$auth.getUser();
        this.superuserFlag =
          this.user.groups.findIndex((g) => {
            return g == "SUPERUSERS";
          }) >= 0;
        this.isTenantAdmin = Object.prototype.hasOwnProperty.call(
          this.user,
          "tenants"
        );
        if (this.isTenantAdmin) {
          this.setTenants(this.user.tenants);
        } else {
          this.setTenants([]);
        }
      }
    },
    async calculatePendingTasks() {
      if (this.activeTenant) {
        var vm = this;
        await axios
          .get(
            //const groupInfo = await ;
            this.$config.api +
              "/api/v1/groups/" +
              this.activeTenant.pendingGroup +
              "?expand=stats",
            { headers: { Authorization: "Bearer " + this.o4oToken } }
          )
          .then(function(response) {
            if (
              Object.prototype.hasOwnProperty.call(response.data, "_embedded")
            ) {
              vm.pendingTasks = response.data._embedded.stats.usersCount;
            } else {
              console.log("Wasnt able to get User count");
              vm.pendingTasks = 0;
            }
          });
        console.log("Pending tasks: " + this.pendingTasks);
        return;
      }

      this.pendingTasks = 0;
    },
    home() {
      this.$router.push({
        name: "home",
      });
    },
    async logout() {
      await this.$auth.logout();
      this.$store.commit("logout");
    },
    routeTo(route) {
      const token = this.$store.state.o4oToken;
      if (!token || token.length <= 0) {
        window.location.href = "/" + route;
      } else {
        this.$router.push("/" + route);
      }
    },
  },
};
</script>
