import { Controller, Get, Inject, Query } from "@nestjs/common";
import { SearchService } from "./search.service";

@Controller("search")
export class SearchController {
  constructor(@Inject(SearchService) private readonly searchService: SearchService) {}

  @Get()
  search(@Query("q") query = "") {
    return this.searchService.search(query);
  }

  @Get("organizations")
  searchOrganizations(@Query("q") query = "", @Query("limit") limit = "25") {
    return this.searchService.searchOrganizations(query, Number(limit));
  }

  @Get("applications")
  searchApplications(@Query("q") query = "", @Query("limit") limit = "25") {
    return this.searchService.searchApplications(query, Number(limit));
  }

  @Get("users")
  searchUsers(@Query("q") query = "", @Query("limit") limit = "25") {
    return this.searchService.searchUsers(query, Number(limit));
  }
}
