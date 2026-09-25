import { Pagination } from "@/components/shared/Pagination";
import { buildHomesHref, type HomesSearch } from "@/features/properties/search-params";

export function ExplorePagination({ search, page, totalPages }: { search: HomesSearch; page: number; totalPages: number }) {
  return <Pagination page={page} totalPages={totalPages} hrefFor={(p) => buildHomesHref(search, { page: p })} />;
}
